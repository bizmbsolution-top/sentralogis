/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/service.ts
 *
 * Canonical Operational Handoff domain authority (ADR-051 .. ADR-056).
 *
 * Security invariant:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02) — commercial:manage / commercial:read.
 * - Handoff number allocated ONLY by the canonical next_operational_handoff_number() RPC.
 * - PK is a DB-generated UUID.
 * - Idempotency: optional idempotency_key with UNIQUE(tenant_id, key).
 * - Adapters act as translation boundaries into sovereign operational domains.
 * - Zero direct writes to job_orders / drivers / armada / GPS.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { CustomsAttachmentService } from '@/lib/domain/customs/attachment-service';
import type { CreateDeclarationDTO } from '@/lib/domain/customs/types';
import {
  OperationalHandoff,
  OperationalHandoffStatus,
  TargetDomain,
  VALID_TARGET_DOMAINS,
  CreateOperationalHandoffInput,
  CreateOperationalHandoffResult,
  OperationalHandoffActionInput,
  OperationalHandoffAction,
  AssignedDomainReference,
  OPERATIONAL_HANDOFF_TRANSITIONS,
  HANDOFF_TERMINAL_STATUSES,
  OperationalHandoffError,
} from './types';
import { getOperationalHandoffAdapter } from './adapters';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface OperationalHandoffDbClient {
  from(table: string): {
    select(cols?: string): OperationalHandoffQueryChain;
    insert(row: DbRow | DbRow[]): OperationalHandoffInsertChain;
    update(row: DbRow): OperationalHandoffUpdateChain;
    delete(): OperationalHandoffDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface OperationalHandoffQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): OperationalHandoffQueryChain;
  in(col: string, vals: unknown[]): OperationalHandoffQueryChain;
  order(col: string, opts: { ascending: boolean }): OperationalHandoffQueryChain;
  limit(count: number): OperationalHandoffQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface OperationalHandoffUpdateChain {
  eq(col: string, val: unknown): OperationalHandoffUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface OperationalHandoffInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface OperationalHandoffDeleteChain {
  eq(col: string, val: unknown): OperationalHandoffDeleteChain;
  select(cols?: string): Promise<DbListResult>;
}

let _client: OperationalHandoffDbClient = supabaseAdmin as unknown as OperationalHandoffDbClient;

export function _setOperationalHandoffDbClient(client: OperationalHandoffDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as OperationalHandoffDbClient);
}

function getDb(): OperationalHandoffDbClient {
  return _client;
}

// ============================================================================
// PHASE 5B: CUSTOMS-FORWARDING ORCHESTRATION HELPERS
// ============================================================================

/**
 * Determines if a Forwarding handoff payload indicates international shipping
 * that requires customs clearance.
 */
function hasInternationalShippingCharacteristics(payload: Record<string, unknown>): boolean {
  return !!(
    payload.vessel_name ||
    payload.voyage_no ||
    payload.shipping_line_name ||
    payload.bill_of_lading ||
    payload.master_bl_number ||
    payload.house_bl_number
  );
}

/**
 * Creates a Customs declaration for a Forwarding handoff when international
 * shipping characteristics are detected.
 *
 * Phase 5B operational orchestration:
 * - Uses CustomsService.createDeclaration() to create cus_declarations directly
 * - Uses CustomsAttachmentService.attachShipment() for ADR-021 progressive attachment
 * - Preserves declaration identity and SHA-256 audit continuity
 */
async function createCustomsDeclarationForForwardingHandoff(
  handoff: OperationalHandoff,
  context: IdentityContext,
): Promise<void> {
  const db = getDb();
  const shipmentId = handoff.requestPayload?.shipmentId as string | undefined;
  const importerEntityId = handoff.requestPayload?.importer_entity_id as string | undefined;

  if (!importerEntityId) {
    throw new OperationalHandoffError(
      'MISSING_IMPORTER_ENTITY',
      `importer_entity_id is required for customs declaration in handoff ${handoff.id}`,
    );
  }

  const customsOfficeCode = (handoff.requestPayload?.customs_office_code as string) || '040300';
  const declarationType = (handoff.requestPayload?.declaration_type as string) || 'PIB_IMPORT';

  const customsService = new CustomsService();

  const dto: CreateDeclarationDTO = {
    tenant_id: handoff.tenantId,
    importer_id: importerEntityId,
    customs_office_code: customsOfficeCode,
    declaration_type: declarationType as any,
    shipment_id: shipmentId || null,
    work_order_id: null,
    service_request_id: null,
    execution_leg_id: null,
    job_order_id: null,
  };

  const declaration = await customsService.createDeclaration(dto);

  if (shipmentId) {
    const attachmentResult = CustomsAttachmentService.attachShipment(
      declaration,
      {
        shipment_id: shipmentId,
        execution_leg_id: handoff.requestPayload?.execution_leg_id as string | undefined,
        tenant_id: handoff.tenantId,
        user_id: context.userId,
      } as any,
      handoff.tenantId,
    );

    if (!attachmentResult.success && attachmentResult.action !== 'ALREADY_ATTACHED') {
      throw new OperationalHandoffError(
        'SHIPMENT_ATTACHMENT_FAILED',
        `Failed to attach shipment ${shipmentId} to declaration ${declaration.id}: ${attachmentResult.message}`,
      );
    }
  }

  const assignedDomainReference: AssignedDomainReference = {
    referenceType: 'DECLARATION',
    referenceId: declaration.id,
    referenceNumber: declaration.declaration_number,
  };

  await db
    .from('operational_handoffs')
    .update({
      assigned_domain_reference: assignedDomainReference,
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    })
    .eq('id', handoff.id)
    .eq('tenant_id', handoff.tenantId);
}

// ============================================================================
// ROW MAPPER
// ============================================================================

function mapRowToOperationalHandoff(row: DbRow): OperationalHandoff {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    handoffNumber: String(row.handoff_number),
    fulfillmentId: String(row.fulfillment_id),
    fulfillmentAllocationId: String(row.fulfillment_allocation_id),
    targetDomain: row.target_domain as TargetDomain,
    status: row.status as OperationalHandoffStatus,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : null,
    requestPayload: (row.request_payload as Record<string, unknown>) ?? {},
    assignedDomainReference: (row.assigned_domain_reference as AssignedDomainReference) ?? null,
    failureCode: row.failure_code ? String(row.failure_code) : null,
    failureReason: row.failure_reason ? String(row.failure_reason) : null,
    attemptCount: typeof row.attempt_count === 'number' ? row.attempt_count : 1,
    issuedAt: String(row.issued_at || row.created_at),
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    executingAt: row.executing_at ? String(row.executing_at) : null,
    fulfilledAt: row.fulfilled_at ? String(row.fulfilled_at) : null,
    failedAt: row.failed_at ? String(row.failed_at) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
}

// ============================================================================
// NUMBER AUTHORITY
// ============================================================================

export async function allocateOperationalHandoffNumber(
  context: IdentityContext,
): Promise<string> {
  const db = getDb();
  const { data, error } = await db.rpc('next_operational_handoff_number', {
    p_tenant_id: context.tenantId,
  });

  if (error || typeof data !== 'string') {
    throw new OperationalHandoffError(
      'DATABASE_ERROR',
      `Failed to allocate operational handoff number: ${error?.message || 'RPC returned non-string'}`,
      error,
    );
  }

  return data;
}

// ============================================================================
// DOMAIN COMMANDS
// ============================================================================

export async function createOperationalHandoff(
  context: IdentityContext,
  input: CreateOperationalHandoffInput,
): Promise<CreateOperationalHandoffResult> {
  assertPermission(context, 'commercial:manage');

  if (!VALID_TARGET_DOMAINS.includes(input.targetDomain)) {
    throw new OperationalHandoffError(
      'INVALID_TARGET_DOMAIN',
      `Target domain '${input.targetDomain}' is not a valid domain (${VALID_TARGET_DOMAINS.join(', ')})`,
    );
  }

  const db = getDb();

  // 1. Validate Fulfillment Ownership
  const { data: flRow, error: flError } = await db
    .from('fulfillments')
    .select('id, tenant_id, status')
    .eq('id', input.fulfillmentId)
    .maybeSingle();

  if (flError) {
    throw new OperationalHandoffError('DATABASE_ERROR', `Failed to check fulfillment: ${flError.message}`, flError);
  }

  if (!flRow || String(flRow.tenant_id) !== context.tenantId) {
    throw new OperationalHandoffError(
      'FULFILLMENT_NOT_FOUND',
      `Fulfillment '${input.fulfillmentId}' not found for tenant`,
    );
  }

  // 2. Validate Allocation Ownership
  const { data: allocRow, error: allocError } = await db
    .from('fulfillment_allocations')
    .select('id, tenant_id, fulfillment_id, capability_type')
    .eq('id', input.fulfillmentAllocationId)
    .maybeSingle();

  if (allocError) {
    throw new OperationalHandoffError('DATABASE_ERROR', `Failed to check allocation: ${allocError.message}`, allocError);
  }

  if (!allocRow || String(allocRow.tenant_id) !== context.tenantId) {
    throw new OperationalHandoffError(
      'ALLOCATION_NOT_FOUND',
      `Fulfillment allocation '${input.fulfillmentAllocationId}' not found for tenant`,
    );
  }

  if (String(allocRow.fulfillment_id) !== input.fulfillmentId) {
    throw new OperationalHandoffError(
      'ALLOCATION_NOT_FOUND',
      `Allocation '${input.fulfillmentAllocationId}' does not belong to fulfillment '${input.fulfillmentId}'`,
    );
  }

  if (String(allocRow.capability_type).toUpperCase() !== input.targetDomain.toUpperCase()) {
    throw new OperationalHandoffError(
      'INVALID_TARGET_DOMAIN',
      `Target domain '${input.targetDomain}' does not match allocation capability '${allocRow.capability_type}'`,
    );
  }

  // 3. Idempotency pre-check
  if (input.idempotencyKey) {
    const { data: existing, error: findError } = await db
      .from('operational_handoffs')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();

    if (!findError && existing) {
      return {
        handoff: mapRowToOperationalHandoff(existing),
        created: false,
      };
    }
  }

  // 4. Allocate Handoff Number
  const handoffNumber = await allocateOperationalHandoffNumber(context);

  // 5. Insert Handoff
  const rowToInsert: DbRow = {
    tenant_id: context.tenantId,
    handoff_number: handoffNumber,
    fulfillment_id: input.fulfillmentId,
    fulfillment_allocation_id: input.fulfillmentAllocationId,
    target_domain: input.targetDomain,
    status: 'ISSUED',
    idempotency_key: input.idempotencyKey || null,
    request_payload: input.requestPayload || {},
    attempt_count: 1,
    created_by: context.userId || null,
    updated_by: context.userId || null,
  };

  const { data: inserted, error: insertError } = await db
    .from('operational_handoffs')
    .insert(rowToInsert)
    .select('*')
    .single();

  if (insertError) {
    // Unique violation catch for idempotency
    if (insertError.code === '23505' && input.idempotencyKey) {
      const { data: reselected, error: reselErr } = await db
        .from('operational_handoffs')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();

      if (!reselErr && reselected) {
        return {
          handoff: mapRowToOperationalHandoff(reselected),
          created: false,
        };
      }
    }

    throw new OperationalHandoffError(
      'DATABASE_ERROR',
      `Failed to create operational handoff: ${insertError.message}`,
      insertError,
    );
  }

  if (!inserted) {
    throw new OperationalHandoffError('DATABASE_ERROR', 'No data returned from handoff insert');
  }

  return {
    handoff: mapRowToOperationalHandoff(inserted),
    created: true,
  };
}

export async function findOperationalHandoffById(
  context: IdentityContext,
  handoffId: string,
): Promise<OperationalHandoff> {
  assertPermission(context, 'commercial:read');

  const db = getDb();
  const { data, error } = await db
    .from('operational_handoffs')
    .select('*')
    .eq('id', handoffId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (error) {
    throw new OperationalHandoffError('DATABASE_ERROR', `Failed to find operational handoff: ${error.message}`, error);
  }

  if (!data) {
    throw new OperationalHandoffError('HANDOFF_NOT_FOUND', `Operational handoff '${handoffId}' not found`);
  }

  return mapRowToOperationalHandoff(data);
}

export async function listOperationalHandoffsByFulfillment(
  context: IdentityContext,
  fulfillmentId: string,
): Promise<OperationalHandoff[]> {
  assertPermission(context, 'commercial:read');

  const db = getDb();
  const { data, error } = await db
    .from('operational_handoffs')
    .select('*')
    .eq('fulfillment_id', fulfillmentId)
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new OperationalHandoffError('DATABASE_ERROR', `Failed to list operational handoffs: ${error.message}`, error);
  }

  return (data || []).map(mapRowToOperationalHandoff);
}

export async function performOperationalHandoffAction(
  context: IdentityContext,
  handoffId: string,
  input: OperationalHandoffActionInput,
): Promise<OperationalHandoff> {
  assertPermission(context, 'commercial:manage');

  const current = await findOperationalHandoffById(context, handoffId);

  let targetStatus: OperationalHandoffStatus;
  const updatePayload: DbRow = {
    updated_at: new Date().toISOString(),
    updated_by: context.userId || null,
  };

  switch (input.action) {
    case 'acknowledge':
      targetStatus = 'ACKNOWLEDGED';
      updatePayload.acknowledged_at = new Date().toISOString();
      break;
    case 'accept': {
      targetStatus = 'ACCEPTED';
      updatePayload.accepted_at = new Date().toISOString();
      const adapter = getOperationalHandoffAdapter(current.targetDomain);
      const validation = await adapter.validate(current);
      if (!validation.valid) {
        throw new OperationalHandoffError(
          'ADAPTER_REJECTED',
          validation.error || `Adapter validation failed for domain ${current.targetDomain}`,
        );
      }
      if (input.assignedDomainReference) {
        updatePayload.assigned_domain_reference = input.assignedDomainReference;
      } else {
        // Use adapter to derive domain reference
        const ref = adapter.createDomainReference(current);
        updatePayload.assigned_domain_reference = ref;
      }
      
      // Phase 5B: Customs auto-creation when Forwarding handoff accepted with international shipping characteristics
      if (current.targetDomain === 'FORWARDING' && current.fulfillmentAllocationId) {
        const hasInternationalShipping = hasInternationalShippingCharacteristics(current.requestPayload);
        if (hasInternationalShipping) {
          await createCustomsDeclarationForForwardingHandoff(current, context);
        }
      }
      break;
    }
    case 'startExecuting':
      targetStatus = 'EXECUTING';
      updatePayload.executing_at = new Date().toISOString();
      break;
    case 'fulfill': {
      targetStatus = 'FULFILLED';
      updatePayload.fulfilled_at = new Date().toISOString();
      if (typeof input.deliveredQuantity === 'number') {
        const dbClient = getDb();
        await dbClient
          .from('fulfillment_allocations')
          .update({
            delivered_quantity: input.deliveredQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', current.fulfillmentAllocationId);
      }
      break;
    }
    case 'fail':
      targetStatus = 'FAILED';
      updatePayload.failed_at = new Date().toISOString();
      updatePayload.failure_code = input.failureCode || 'EXECUTION_FAILED';
      updatePayload.failure_reason = input.failureReason || 'Operational execution failed';
      break;
    case 'reject':
      targetStatus = 'REJECTED';
      updatePayload.rejected_at = new Date().toISOString();
      updatePayload.failure_code = input.failureCode || 'DOMAIN_REJECTED';
      updatePayload.failure_reason = input.failureReason || 'Operational domain rejected handoff';
      break;
    case 'cancel':
      targetStatus = 'CANCELLED';
      updatePayload.cancelled_at = new Date().toISOString();
      break;
    default:
      throw new OperationalHandoffError(
        'INVALID_STATUS_TRANSITION',
        `Unknown action '${(input as { action?: string }).action}'`,
      );
  }

  // Validate allowed transition
  const allowed = OPERATIONAL_HANDOFF_TRANSITIONS[current.status];
  if (!allowed.includes(targetStatus)) {
    throw new OperationalHandoffError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition operational handoff from '${current.status}' to '${targetStatus}'`,
    );
  }

  updatePayload.status = targetStatus;

  const db = getDb();
  const { data: updated, error } = await db
    .from('operational_handoffs')
    .update(updatePayload)
    .eq('id', handoffId)
    .eq('tenant_id', context.tenantId)
    .select('*');

  if (error) {
    throw new OperationalHandoffError('DATABASE_ERROR', `Failed to update operational handoff: ${error.message}`, error);
  }

  const updatedRow = Array.isArray(updated) ? updated[0] : updated;
  if (!updatedRow) {
    throw new OperationalHandoffError('HANDOFF_NOT_FOUND', `Operational handoff '${handoffId}' could not be updated`);
  }

  return mapRowToOperationalHandoff(updatedRow);
}
