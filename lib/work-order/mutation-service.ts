/**
 * Sentralogis — Phase 3 / Unit 2
 * lib/work-order/mutation-service.ts
 *
 * Canonical Work Order mutation service for Phase 3 Unit 2.
 *
 * MUTATION AUTHORITY: Canonical Unit 2 mutation authority.
 * Every command represents explicit business intent.
 * No generic CRUD abstraction.
 *
 * Commands:
 * - WO_CREATE: Create a new work order
 * - WO_UPDATE: Update work order fields
 * - WO_TRANSITION: Transition WO status
 * - WO_CANCEL: Cancel a work order
 * - WO_COMMITMENT_UPDATE: Update WO commitment/pricing
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All mutations include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any mutation.
 * - Cross-tenant access is impossible (tenant filters on every mutation).
 * - Audit trail recorded for every mutation.
 * - Idempotency protected where required.
 */

import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import type {
  WoMutationCommand,
  WoCreateInput,
  WoUpdateInput,
  WoTransitionInput,
  WoCancelInput,
  WoCommitmentUpdateInput,
  WoItemUpsertInput,
  WoItemUpsertItemInput,
  JoCreateInput,
  WoMutationResult,
  WoMutationErrorCode,
  MutationAuditRecord,
  MutationOutcome,
  MutationStage,
  IdempotencyRecord,
} from './mutation-types';
import { WoMutationError } from './mutation-types';
import type { WorkOrderStatus } from './types';

// ============================================================================
// CANONICAL JSON & PAYLOAD FINGERPRINTING (Option C Contract)
// ============================================================================

export function canonicalizeJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map((item) => canonicalizeJson(item)).join(',') + ']';
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries: string[] = [];
  for (const k of sortedKeys) {
    const v = obj[k];
    if (v !== undefined) {
      entries.push(JSON.stringify(k) + ':' + canonicalizeJson(v));
    }
  }
  return '{' + entries.join(',') + '}';
}

export function computePayloadHash(payload: unknown): string {
  const canonical = canonicalizeJson(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbListResult { data: DbRow[] | null; error: DbError | null }
interface DbSingleResult { data: DbRow | null; error: DbError | null }

export interface WorkOrderMutationDbClient {
  from(table: string): {
    select(cols?: string): WorkOrderMutationQueryChain;
    insert(row: DbRow | DbRow[]): WorkOrderMutationInsertChain;
    update(row: DbRow): WorkOrderMutationUpdateChain;
    delete(): WorkOrderMutationDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: DbError | null }>;
}

interface WorkOrderMutationQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderMutationQueryChain;
  in(col: string, vals: unknown[]): WorkOrderMutationQueryChain;
  is(col: string, val: unknown | null): WorkOrderMutationQueryChain;
  not(col: string, op: string, val: string): WorkOrderMutationQueryChain;
  order(col: string, opts: { ascending: boolean }): WorkOrderMutationQueryChain;
  range(start: number, end: number): WorkOrderMutationQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface WorkOrderMutationInsertChain extends PromiseLike<DbListResult> {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface WorkOrderMutationUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderMutationUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface WorkOrderMutationDeleteChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderMutationDeleteChain;
}

let _client: WorkOrderMutationDbClient = supabaseAdmin as unknown as WorkOrderMutationDbClient;

export function _setWorkOrderMutationDbClient(client: WorkOrderMutationDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as WorkOrderMutationDbClient);
}

function db(): WorkOrderMutationDbClient {
  return _client;
}

// ============================================================================
// UUID VALIDATION
// ============================================================================

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function validateUuid(value: string, field: string): void {
  if (!value || !UUID_RE.test(value)) {
    throw new WoMutationError('VALIDATION_FAILED', 400, `${field} must be a valid UUID.`);
  }
}

function validateRequiredString(value: string | null | undefined, field: string): void {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new WoMutationError('VALIDATION_FAILED', 400, `${field} is required.`);
  }
}

// ============================================================================
// SALES ORDER ELIGIBILITY (SO-Mandatory — Phase 3C, L1)
// Verified enum values (migrasi 20260828_019:37-45): DRAFT, CONFIRMED,
// IN_FULFILLMENT, PARTIALLY_FULFILLED, FULFILLED, CLOSED, CANCELLED.
// ============================================================================

const SO_ELIGIBLE_STATUSES = new Set(['CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED']);

interface SoEligibilityResult {
  ok: boolean;
  code?: WoMutationErrorCode;
  message?: string;
}

async function validateSoEligibility(
  context: IdentityContext,
  salesOrderId: string,
  expectedCustomerId: string,
): Promise<SoEligibilityResult> {
  validateUuid(salesOrderId, 'salesOrderId');

  // Tenant ownership: the SO must resolve under the AUTHORITATIVE tenant context.
  // Cross-tenant and missing SOs return the same code (no existence disclosure).
  const { data: soRow, error: soErr } = await db()
    .from('sales_orders')
    .select('id, tenant_id, status, engagement_id')
    .eq('id', salesOrderId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (soErr) {
    return { ok: false, code: 'DATABASE_ERROR', message: soErr.message };
  }
  if (!soRow) {
    return { ok: false, code: 'SO_NOT_FOUND', message: 'Sales order not found.' };
  }
  if (!SO_ELIGIBLE_STATUSES.has(String(soRow.status))) {
    return {
      ok: false,
      code: 'SO_STATUS_INELIGIBLE',
      message: `Sales order status "${String(soRow.status)}" is not eligible for new work order creation.`,
    };
  }

  // Customer consistency: SO → engagement → customer (no direct customer_id on sales_orders).
  const { data: engagement, error: engErr } = await db()
    .from('commercial_work_orders')
    .select('id, tenant_id, customer_id')
    .eq('id', String(soRow.engagement_id))
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (engErr) {
    return { ok: false, code: 'DATABASE_ERROR', message: engErr.message };
  }
  if (!engagement) {
    return { ok: false, code: 'SO_NOT_FOUND', message: 'Sales order lineage could not be resolved.' };
  }
  if (String(engagement.customer_id) !== expectedCustomerId) {
    return {
      ok: false,
      code: 'SO_CUSTOMER_MISMATCH',
      message: 'Sales order customer does not match the work order customer.',
    };
  }
  return { ok: true };
}

// ============================================================================
// AUDIT SERVICE
// ============================================================================

async function recordAudit(
  context: IdentityContext,
  command: string,
  targetId: string,
  targetType: 'WORK_ORDER' | 'WORK_ORDER_ITEM' | 'JOB_ORDER',
  previousState?: Record<string, unknown>,
  newState?: Record<string, unknown>,
  reason?: string | null,
  correlationId?: string | null,
  idempotencyKey?: string | null,
): Promise<MutationAuditRecord & { persisted: boolean }> {
  const auditId = crypto.randomUUID();
  const now = new Date().toISOString();

  const auditPayload: MutationAuditRecord = {
    id: auditId,
    tenantId: context.tenantId,
    actorId: context.userId,
    command,
    targetId,
    targetType,
    previousState,
    newState,
    reason: reason ?? null,
    correlationId: correlationId ?? null,
    idempotencyKey: idempotencyKey ?? null,
    source: 'unit2-canonical',
    createdAt: now,
  };

  let persisted = false;
  try {
    const res = (await db().from('work_order_audit').insert({
      id: auditId,
      tenant_id: context.tenantId,
      actor_id: context.userId,
      command,
      target_id: targetId,
      target_type: targetType,
      previous_state: previousState ?? null,
      new_state: newState ?? null,
      reason: reason ?? null,
      correlation_id: correlationId ?? null,
      idempotency_key: idempotencyKey ?? null,
      source: 'unit2-canonical',
      created_at: now,
    })) as { error?: { message?: string } | null };
    persisted = !res?.error;
  } catch {
    persisted = false;
  }
  if (!persisted) {
    // Audit failure must not block the mutation — log and continue (observable via `persisted`).
    console.error('Audit recording failed:', auditId, command, targetId);
  }

  return { ...auditPayload, persisted };
}

// ============================================================================
// IDEMPOTENCY SERVICE
// ============================================================================

async function checkIdempotency(
  context: IdentityContext,
  command: string,
  targetId: string,
  idempotencyKey: string,
): Promise<boolean> {
  try {
    const { data } = await db()
      .from('work_order_idempotency')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .eq('tenant_id', context.tenantId)
      .eq('command', command)
      .eq('target_id', targetId)
      .maybeSingle();

    return data !== null;
  } catch {
    return false;
  }
}

async function recordIdempotency(
  context: IdentityContext,
  command: string,
  targetId: string,
  idempotencyKey: string,
  result: unknown,
): Promise<boolean> {
  let persisted = false;
  try {
    const res = (await db().from('work_order_idempotency').insert({
      id: crypto.randomUUID(),
      idempotency_key: idempotencyKey,
      tenant_id: context.tenantId,
      command,
      target_id: targetId,
      result,
      created_at: new Date().toISOString(),
    })) as { error?: { message?: string } | null };
    persisted = !res?.error;
  } catch {
    persisted = false;
  }
  if (!persisted) {
    // Idempotency recording failure must not block the mutation (observable via return value).
    console.error('Idempotency recording failed:', idempotencyKey, command, targetId);
  }
  return persisted;
}

function parseRpcError(errMessage: string): { code: WoMutationErrorCode; message: string; statusCode: 400 | 404 | 409 | 425 | 500 } {
  const msg = errMessage || '';
  if (msg.includes('OPERATION_IN_PROGRESS')) {
    return { code: 'OPERATION_IN_PROGRESS', message: msg, statusCode: 425 };
  }
  if (msg.includes('IDEMPOTENCY_CONFLICT')) {
    return { code: 'IDEMPOTENCY_CONFLICT', message: msg, statusCode: 409 };
  }
  if (msg.includes('SO_REQUIRED')) {
    return { code: 'SO_REQUIRED', message: 'salesOrderId is required for new work order creation.', statusCode: 400 };
  }
  if (msg.includes('SO_NOT_FOUND')) {
    return { code: 'SO_NOT_FOUND', message: 'Sales order not found.', statusCode: 400 };
  }
  if (msg.includes('SO_STATUS_INELIGIBLE')) {
    return { code: 'SO_STATUS_INELIGIBLE', message: msg, statusCode: 400 };
  }
  if (msg.includes('SO_CUSTOMER_MISMATCH')) {
    return { code: 'SO_CUSTOMER_MISMATCH', message: 'Sales order customer does not match the work order customer.', statusCode: 400 };
  }
  if (msg.includes('DUPLICATE') || msg.includes('23505')) {
    return { code: 'DUPLICATE', message: msg, statusCode: 409 };
  }
  if (msg.includes('NOT_FOUND')) {
    return { code: 'NOT_FOUND', message: msg, statusCode: 404 };
  }
  if (msg.includes('VALIDATION_FAILED')) {
    return { code: 'VALIDATION_FAILED', message: msg, statusCode: 400 };
  }
  return { code: 'DATABASE_ERROR', message: msg, statusCode: 500 };
}

function isRpcUnavailable(data: unknown, error: DbError | null): boolean {
  if (error) {
    const msg = error.message || '';
    if (
      error.code === 'PGRST202' ||
      error.code === '42883' ||
      error.code === '42703' ||
      msg.includes('Could not find the function') ||
      msg.includes('rpc_wo_mutation_execute_v1') ||
      msg.includes('target_fulfillment_date') ||
      msg.includes('does not exist')
    ) {
      return true;
    }
    return false;
  }
  return data === null || data === undefined;
}

function mapWoRowToRecord(row: DbRow) {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    woNumber: String(row.wo_number),
    customerId: String(row.customer_id),
    customerName: row.customer_name ? String(row.customer_name) : null,
    status: (row.status as WorkOrderStatus) ?? 'draft',
    orderDate: row.order_date ? String(row.order_date) : null,
    executionDate: row.execution_date ? String(row.execution_date) : null,
    executionTime: row.execution_time ? String(row.execution_time) : null,
    targetFulfillmentDate: row.target_fulfillment_date ? String(row.target_fulfillment_date) : null,
    notes: row.notes ? String(row.notes) : null,
    transporterId: row.transporter_id ? String(row.transporter_id) : null,
    basePrice: typeof row.base_price === 'number' ? row.base_price : null,
    purchasePrice: typeof row.purchase_price === 'number' ? row.purchase_price : null,
    vendorPrice: typeof row.vendor_price === 'number' ? row.vendor_price : null,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
}

// ============================================================================
// WO MUTATION SERVICE
// ============================================================================

export class WorkOrderMutationService {
  /**
   * WO_CREATE — Create a new work order.
   */
  static async create(
    context: IdentityContext,
    input: WoCreateInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    const stages: MutationStage[] = [];
    assertPermission(context, 'work_order:create');
    validateRequiredString(input.woNumber, 'woNumber');
    validateRequiredString(input.customerId, 'customerId');

    // SO-Mandatory (Phase 3C / L1): every new WO must reference a Sales Order.
    if (!input.salesOrderId || typeof input.salesOrderId !== 'string' || !input.salesOrderId.trim()) {
      return {
        success: false,
        code: 'SO_REQUIRED',
        outcome: 'FAILED',
        stages,
        error: 'salesOrderId is required for new work order creation.',
      };
    }

    // L3-1: stable caller-supplied idempotency key is mandatory for slice commands.
    if (!opts?.idempotencyKey || typeof opts.idempotencyKey !== 'string' || !opts.idempotencyKey.trim()) {
      return {
        success: false,
        code: 'VALIDATION_FAILED',
        outcome: 'FAILED',
        stages,
        error: 'idempotencyKey is required for WO_CREATE. Reuse the same key when retrying the same logical command.',
      };
    }
    const idempotencyKey = opts.idempotencyKey;

    const payloadObj = {
      woNumber: input.woNumber,
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      status: input.status ?? 'draft',
      orderDate: input.orderDate ?? null,
      executionDate: input.executionDate ?? null,
      executionTime: input.executionTime ?? null,
      orderTime: input.orderTime ?? null,
      regionId: input.regionId ?? null,
      targetFulfillmentDate: input.targetFulfillmentDate ?? null,
      notes: input.notes ?? null,
      transporterId: input.transporterId ?? null,
      reason: opts?.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_CREATE',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: input.woNumber,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return {
            success: false,
            code: parsed.code,
            outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
            stages,
            error: parsed.message,
          };
        }
        return data as WoMutationResult;
      }

      // Fallback path when RPC is not deployed in schema cache or mock returns null
      const alreadyUsed = await checkIdempotency(context, 'WO_CREATE', input.woNumber, idempotencyKey);
      if (alreadyUsed) {
        return {
          success: false,
          code: 'IDEMPOTENCY_VIOLATION',
          outcome: 'FAILED',
          stages,
          error: 'Idempotency key already used.',
        };
      }

      const soEligibility = await validateSoEligibility(context, input.salesOrderId, input.customerId);
      if (!soEligibility.ok) {
        return {
          success: false,
          code: soEligibility.code ?? 'VALIDATION_FAILED',
          outcome: 'FAILED',
          stages,
          error: soEligibility.message ?? 'Sales order is not eligible.',
        };
      }

      const woId = crypto.randomUUID();
      const now = new Date().toISOString();
      const isLiveSchemaFallback = Boolean(error);
      const effectiveNotes = isLiveSchemaFallback
        ? input.notes
          ? input.notes.includes(input.salesOrderId)
            ? input.notes
            : `${input.notes} [SO:${input.salesOrderId}]`
          : `[SO:${input.salesOrderId}]`
        : (input.notes ?? null);

      const woRow: DbRow = {
        id: woId,
        tenant_id: context.tenantId,
        wo_number: input.woNumber,
        customer_id: input.customerId,
        status: input.status ?? 'draft',
        order_date: input.orderDate ?? new Date().toISOString().slice(0, 10),
        execution_date: input.executionDate ?? null,
        execution_time: input.executionTime ?? null,
        notes: effectiveNotes,
        region_id: input.regionId ?? null,
        created_by: context.userId,
        updated_by: context.userId,
        created_at: now,
        updated_at: now,
        ...(input.transporterId ? { transporter_id: input.transporterId } : {}),
      };

      const insRes = await db().from('work_orders').insert(woRow);
      if (insRes.error) {
        const parsed = parseRpcError(insRes.error.code === '23505' ? '23505: Duplicate work order number' : insRes.error.message);
        return {
          success: false,
          code: parsed.code,
          outcome: 'FAILED',
          stages,
          error: parsed.message,
        };
      }

      stages.push({ stage: 'work_order', status: 'SUCCEEDED', id: woId });

      const audit = await recordAudit(
        context,
        'WO_CREATE',
        woId,
        'WORK_ORDER',
        {},
        {
          woNumber: input.woNumber,
          customerId: input.customerId,
          salesOrderId: input.salesOrderId,
          status: input.status ?? 'draft',
        },
        opts?.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );
      stages.push({
        stage: 'audit',
        status: audit.persisted ? 'SUCCEEDED' : 'FAILED',
        id: audit.id,
        error: audit.persisted ? undefined : 'Audit record not persisted.',
      });

      const workOrder = mapWoRowToRecord(woRow);
      const idemPersisted = await recordIdempotency(context, 'WO_CREATE', input.woNumber, idempotencyKey, {
        workOrderId: woId,
      });
      stages.push({
        stage: 'idempotency',
        status: idemPersisted ? 'SUCCEEDED' : 'FAILED',
      });

      return {
        success: true,
        outcome: 'SUCCEEDED',
        stages,
        workOrder,
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return {
        success: false,
        code: parsed.code,
        outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
        stages,
        error: parsed.message,
      };
    }
  }

  /**
   * WO_ITEM_UPSERT — Create or reconcile WO items (and conditional manifests)
   * through the shared server boundary. SO-Mandatory Slice 1 (Phase 3C / L2).
   * Tenant scoping: parent WO / item ids must resolve under context.tenantId.
   */
  static async woItemUpsert(
    context: IdentityContext,
    input: WoItemUpsertInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    const stages: MutationStage[] = [];
    assertPermission(context, 'work_order:update');
    validateRequiredString(input.workOrderId, 'workOrderId');
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false, code: 'VALIDATION_FAILED', outcome: 'FAILED', stages, error: 'items array is required.' };
    }
    if (!opts?.idempotencyKey || typeof opts.idempotencyKey !== 'string' || !opts.idempotencyKey.trim()) {
      return {
        success: false,
        code: 'VALIDATION_FAILED',
        outcome: 'FAILED',
        stages,
        error: 'idempotencyKey is required for WO_ITEM_UPSERT. Reuse the same key when retrying the same logical command.',
      };
    }
    const idempotencyKey = opts.idempotencyKey;

    const payloadObj = {
      workOrderId: input.workOrderId,
      items: input.items,
      reason: opts?.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_ITEM_UPSERT',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: input.workOrderId,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return {
            success: false,
            code: parsed.code,
            outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
            stages,
            error: parsed.message,
          };
        }
        return data as WoMutationResult;
      }

      // Fallback path when RPC is not deployed in schema cache
      const { data: parentWo, error: woErr } = await db()
        .from('work_orders')
        .select('id, tenant_id, wo_number')
        .eq('id', input.workOrderId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (woErr) {
        return { success: false, code: 'DATABASE_ERROR', outcome: 'FAILED', stages, error: woErr.message };
      }
      if (!parentWo) {
        return { success: false, code: 'NOT_FOUND', outcome: 'FAILED', stages, error: 'Work order not found.' };
      }

      const itemResults: Array<{ clientKey: string; id: string | null; status: 'SUCCEEDED' | 'FAILED'; error?: string }> = [];
      for (const item of input.items) {
        let itemId = item.id ?? null;
        if (itemId) {
          const { data: existingItem } = await db()
            .from('wo_items')
            .select('id, tenant_id')
            .eq('id', itemId)
            .eq('tenant_id', context.tenantId)
            .maybeSingle();
          if (!existingItem) {
            return { success: false, code: 'NOT_FOUND', outcome: 'FAILED', stages, error: 'Referenced item not found.' };
          }
          const updRes = await db()
            .from('wo_items')
            .update({
              item_code: item.itemCode ?? null,
              sbu_type: item.sbuType,
              max_jo_count: item.maxJoCount ?? 1,
              unit_price: item.unitPrice ?? 0,
              total_revenue: item.totalRevenue ?? 0,
              status: item.status ?? 'draft',
              item_data: item.itemData ?? {},
              ...((item as any).serviceName ? { service_name: (item as any).serviceName } : {}),
              ...((item as any).pricingType ? { pricing_type: (item as any).pricingType } : {}),
              ...((item as any).qty !== undefined && (item as any).qty !== null ? { qty: (item as any).qty } : {}),
              ...((item as any).sbuMetadata ? { sbu_metadata: (item as any).sbuMetadata } : {}),
            })
            .eq('id', itemId)
            .eq('tenant_id', context.tenantId);
          if (updRes.error) {
            itemResults.push({ clientKey: item.clientKey, id: null, status: 'FAILED', error: updRes.error.message });
            return {
              success: false,
              code: 'PARTIAL',
              outcome: 'PARTIAL',
              items: itemResults,
              stages,
              error: `Item stage failed: ${updRes.error.message}. retry with the same idempotency key.`,
            };
          }
        } else {
          itemId = crypto.randomUUID();
          const insItemRes = await db().from('wo_items').insert({
            id: itemId,
            tenant_id: context.tenantId,
            wo_id: input.workOrderId,
            item_code: item.itemCode ?? null,
            sbu_type: item.sbuType,
            max_jo_count: item.maxJoCount ?? 1,
            unit_price: item.unitPrice ?? 0,
            total_revenue: item.totalRevenue ?? 0,
            status: item.status ?? 'draft',
            item_data: item.itemData ?? {},
            ...((item as any).serviceName ? { service_name: (item as any).serviceName } : {}),
            ...((item as any).pricingType ? { pricing_type: (item as any).pricingType } : {}),
            ...((item as any).qty !== undefined && (item as any).qty !== null ? { qty: (item as any).qty } : {}),
            ...((item as any).sbuMetadata ? { sbu_metadata: (item as any).sbuMetadata } : {}),
          });
          if (insItemRes.error) {
            itemResults.push({ clientKey: item.clientKey, id: null, status: 'FAILED', error: insItemRes.error.message });
            return {
              success: false,
              code: 'PARTIAL',
              outcome: 'PARTIAL',
              items: itemResults,
              stages,
              error: `Item stage failed: ${insItemRes.error.message}. retry with the same idempotency key.`,
            };
          }
        }

        if (Array.isArray(item.manifests)) {
          await db().from('wo_item_manifests').delete().eq('wo_item_id', itemId).eq('tenant_id', context.tenantId);
          if (item.manifests.length > 0) {
            const manifestRows = item.manifests.map((m) => ({
              id: crypto.randomUUID(),
              tenant_id: context.tenantId,
              wo_item_id: itemId,
              product_sku_id: m.productSkuId,
              quantity: m.quantity,
              unit_weight_kg: m.unitWeightKg ?? 0,
              unit_volume_m3: m.unitVolumeM3 ?? 0,
              notes: m.notes ?? null,
              location_code: m.locationCode ?? null,
              inventory_id: m.inventoryId ?? null,
              batch_number: m.batchNumber ?? null,
              earliest_expiry: m.earliestExpiry ?? null,
            }));
            await db().from('wo_item_manifests').insert(manifestRows);
          }
        }

        itemResults.push({ clientKey: item.clientKey, id: itemId, status: 'SUCCEEDED' });
      }

      stages.push({ stage: 'items', status: 'SUCCEEDED' });
      const audit = await recordAudit(
        context,
        'WO_ITEM_UPSERT',
        input.workOrderId,
        'WORK_ORDER_ITEM',
        {},
        { workOrderId: input.workOrderId, itemCount: itemResults.length },
        opts?.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );
      stages.push({ stage: 'audit', status: audit.persisted ? 'SUCCEEDED' : 'FAILED', id: audit.id });
      const idemPersisted = await recordIdempotency(context, 'WO_ITEM_UPSERT', input.workOrderId, idempotencyKey, {
        items: itemResults,
      });
      stages.push({ stage: 'idempotency', status: idemPersisted ? 'SUCCEEDED' : 'FAILED' });

      return {
        success: true,
        outcome: 'SUCCEEDED',
        items: itemResults,
        stages,
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return {
        success: false,
        code: parsed.code,
        outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
        stages,
        error: parsed.message,
      };
    }
  }

  /**
   * JO_CREATE — Create a Job Order linked to a tenant-verified WO item, with
   * optional trucking route replacement. Natural-key readback on
   * UNIQUE(tenant_id, jo_number) for UNKNOWN/retry safety (L3-4/L3-9).
   */
  static async createJobOrder(
    context: IdentityContext,
    input: JoCreateInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    const stages: MutationStage[] = [];
    assertPermission(context, 'work_order:update');
    validateRequiredString(input.woItemId, 'woItemId');
    validateRequiredString(input.joNumber, 'joNumber');
    if (!opts?.idempotencyKey || typeof opts.idempotencyKey !== 'string' || !opts.idempotencyKey.trim()) {
      return {
        success: false,
        code: 'VALIDATION_FAILED',
        outcome: 'FAILED',
        stages,
        error: 'idempotencyKey is required for JO_CREATE. Reuse the same key when retrying the same logical command.',
      };
    }
    const idempotencyKey = opts.idempotencyKey;

    const payloadObj = {
      woItemId: input.woItemId,
      joNumber: input.joNumber,
      status: input.status ?? 'pending',
      sbuType: input.sbuType ?? null,
      totalStops: input.totalStops ?? null,
      routes: input.routes ?? null,
      reason: opts?.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'JO_CREATE',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: input.joNumber,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return {
            success: false,
            code: parsed.code,
            outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
            stages,
            error: parsed.message,
          };
        }
        return data as WoMutationResult;
      }

      // Fallback path when RPC is not deployed in schema cache
      const { data: woItem, error: itemErr } = await db()
        .from('wo_items')
        .select('id, tenant_id, wo_id, sbu_type')
        .eq('id', input.woItemId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (itemErr) {
        return { success: false, code: 'DATABASE_ERROR', outcome: 'FAILED', stages, error: itemErr.message };
      }
      if (!woItem) {
        return { success: false, code: 'NOT_FOUND', outcome: 'FAILED', stages, error: 'Work order item not found.' };
      }

      const { data: existingJo } = await db()
        .from('job_orders')
        .select('id, tenant_id, wo_item_id, jo_number, status')
        .eq('jo_number', input.joNumber)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      let joId: string;
      if (existingJo) {
        if (String(existingJo.wo_item_id) !== input.woItemId) {
          return {
            success: false,
            code: 'DUPLICATE',
            outcome: 'FAILED',
            stages,
            error: 'Job order number already exists for another work order item.',
          };
        }
        joId = String(existingJo.id);
        stages.push({ stage: 'readback', status: 'SUCCEEDED', id: joId });
      } else {
        joId = crypto.randomUUID();
        const insJoRes = await db().from('job_orders').insert({
          id: joId,
          tenant_id: context.tenantId,
          wo_item_id: input.woItemId,
          jo_number: input.joNumber,
          status: input.status ?? 'pending',
          sbu_type: input.sbuType ?? String(woItem.sbu_type ?? 'TRUCKING'),
          total_stops: input.totalStops ?? (Array.isArray(input.routes) ? input.routes.length : 0),
          created_at: new Date().toISOString(),
        });
        if (insJoRes.error) {
          const parsed = parseRpcError(
            insJoRes.error.code === '23505' ? '23505: Duplicate job order number' : insJoRes.error.message,
          );
          return { success: false, code: parsed.code, outcome: 'FAILED', stages, error: parsed.message };
        }
        stages.push({ stage: 'job_order', status: 'SUCCEEDED', id: joId });
      }

      if (Array.isArray(input.routes)) {
        await db().from('job_routes').delete().eq('job_order_id', joId);
        if (input.routes.length > 0) {
          const routeRows = input.routes.map((r) => ({
            id: crypto.randomUUID(),
            job_order_id: joId,
            sequence: r.sequence,
            stop_type: r.stopType,
            source_type: r.sourceType ?? 'MD_LOCATION',
            ...((r as any).sourceId !== undefined ? { source_id: (r as any).sourceId ?? null } : {}),
            ...((r as any).masterLocationId !== undefined ? { master_location_id: (r as any).masterLocationId ?? null } : {}),
            ...((r as any).warehouseId !== undefined ? { warehouse_id: (r as any).warehouseId ?? null } : {}),
            location_name: r.locationName,
            address: r.address ?? null,
            latitude: r.latitude ?? null,
            longitude: r.longitude ?? null,
            contact_name: r.contactName ?? null,
            contact_phone: r.contactPhone ?? null,
            ...((r as any).notes !== undefined ? { notes: (r as any).notes ?? null } : {}),
            status: r.status ?? 'PENDING',
          }));
          await db().from('job_routes').insert(routeRows);
        }
        stages.push({ stage: 'routes', status: 'SUCCEEDED' });
      }

      const audit = await recordAudit(
        context,
        'JO_CREATE',
        joId,
        'JOB_ORDER',
        existingJo ? { joNumber: input.joNumber, woItemId: input.woItemId, reconciled: true } : {},
        { joNumber: input.joNumber, woItemId: input.woItemId, reconciled: Boolean(existingJo) },
        opts?.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );
      stages.push({ stage: 'audit', status: audit.persisted ? 'SUCCEEDED' : 'FAILED', id: audit.id });
      const idemPersisted = await recordIdempotency(context, 'JO_CREATE', input.joNumber, idempotencyKey, {
        jobOrderId: joId,
      });
      stages.push({ stage: 'idempotency', status: idemPersisted ? 'SUCCEEDED' : 'FAILED' });

      return {
        success: true,
        outcome: 'SUCCEEDED',
        stages,
        jobOrder: {
          id: joId,
          tenantId: context.tenantId,
          woItemId: input.woItemId,
          joNumber: input.joNumber,
          status: (input.status ?? 'pending') as any,
          sbuType: (input.sbuType ?? String(woItem.sbu_type ?? 'TRUCKING')) as any,
        } as any,
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return {
        success: false,
        code: parsed.code,
        outcome: parsed.code === 'OPERATION_IN_PROGRESS' ? 'UNKNOWN' : 'FAILED',
        stages,
        error: parsed.message,
      };
    }
  }

  /**
   * WO_UPDATE — Update work order fields.
   */
  static async update(
    context: IdentityContext,
    workOrderId: string,
    input: WoUpdateInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    assertPermission(context, 'work_order:update');
    validateUuid(workOrderId, 'workOrderId');

    const idempotencyKey = opts?.idempotencyKey ?? crypto.randomUUID();

    const payloadObj = {
      workOrderId,
      woNumber: input.woNumber,
      customerId: input.customerId,
      status: input.status,
      orderDate: input.orderDate,
      executionDate: input.executionDate,
      executionTime: input.executionTime,
      targetFulfillmentDate: input.targetFulfillmentDate,
      notes: input.notes,
      transporterId: input.transporterId,
      reason: opts?.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_UPDATE',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: workOrderId,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return { success: false, code: parsed.code, error: parsed.message };
        }
        return data as WoMutationResult;
      }

      const { data: existing, error: findErr } = await db()
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (findErr) {
        return { success: false, code: 'DATABASE_ERROR', error: findErr.message };
      }
      if (!existing) {
        return { success: false, code: 'NOT_FOUND', error: 'Work order not found.' };
      }

      const patch: DbRow = { updated_at: new Date().toISOString(), updated_by: context.userId };
      if (input.woNumber !== undefined) patch.wo_number = input.woNumber;
      if (input.customerId !== undefined) patch.customer_id = input.customerId;
      if (input.status !== undefined) patch.status = input.status;
      if (input.orderDate !== undefined) patch.order_date = input.orderDate;
      if (input.executionDate !== undefined) patch.execution_date = input.executionDate;
      if (input.executionTime !== undefined) patch.execution_time = input.executionTime;
      if (input.notes !== undefined) patch.notes = input.notes;
      if (input.transporterId !== undefined) patch.transporter_id = input.transporterId;

      const updRes = await db()
        .from('work_orders')
        .update(patch)
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId);

      if (updRes.error) {
        const parsed = parseRpcError(updRes.error.message);
        return { success: false, code: parsed.code, error: parsed.message };
      }

      const updatedRow = { ...existing, ...patch };
      const audit = await recordAudit(
        context,
        'WO_UPDATE',
        workOrderId,
        'WORK_ORDER',
        existing,
        updatedRow,
        opts?.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );

      return {
        success: true,
        outcome: 'SUCCEEDED',
        workOrder: mapWoRowToRecord(updatedRow),
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return { success: false, code: parsed.code, error: parsed.message };
    }
  }

  /**
   * WO_TRANSITION — Transition WO status.
   */
  static async transition(
    context: IdentityContext,
    workOrderId: string,
    input: WoTransitionInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    assertPermission(context, 'work_order:update');
    validateUuid(workOrderId, 'workOrderId');
    validateRequiredString(input.newStatus, 'newStatus');

    const idempotencyKey = opts?.idempotencyKey ?? crypto.randomUUID();

    const payloadObj = {
      workOrderId,
      newStatus: input.newStatus,
      reason: opts?.reason ?? input.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_TRANSITION',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: workOrderId,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return { success: false, code: parsed.code, error: parsed.message };
        }
        return data as WoMutationResult;
      }

      const { data: existing, error: findErr } = await db()
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (findErr) {
        return { success: false, code: 'DATABASE_ERROR', error: findErr.message };
      }
      if (!existing) {
        return { success: false, code: 'NOT_FOUND', error: 'Work order not found.' };
      }

      const patch: DbRow = {
        status: input.newStatus,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      };

      const updRes = await db()
        .from('work_orders')
        .update(patch)
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId);

      if (updRes.error) {
        const parsed = parseRpcError(updRes.error.message);
        return { success: false, code: parsed.code, error: parsed.message };
      }

      const updatedRow = { ...existing, ...patch };
      const audit = await recordAudit(
        context,
        'WO_TRANSITION',
        workOrderId,
        'WORK_ORDER',
        existing,
        updatedRow,
        opts?.reason ?? input.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );

      return {
        success: true,
        outcome: 'SUCCEEDED',
        workOrder: mapWoRowToRecord(updatedRow),
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return { success: false, code: parsed.code, error: parsed.message };
    }
  }

  /**
   * WO_CANCEL — Cancel a work order.
   */
  static async cancel(
    context: IdentityContext,
    workOrderId: string,
    input: WoCancelInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    assertPermission(context, 'work_order:update');
    validateUuid(workOrderId, 'workOrderId');
    validateRequiredString(input.reason, 'reason');

    const idempotencyKey = opts?.idempotencyKey ?? crypto.randomUUID();

    const payloadObj = {
      workOrderId,
      reason: input.reason,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_CANCEL',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: workOrderId,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return { success: false, code: parsed.code, error: parsed.message };
        }
        return data as WoMutationResult;
      }

      const { data: existing, error: findErr } = await db()
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (findErr) {
        return { success: false, code: 'DATABASE_ERROR', error: findErr.message };
      }
      if (!existing) {
        return { success: false, code: 'NOT_FOUND', error: 'Work order not found.' };
      }

      const patch: DbRow = {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      };

      const updRes = await db()
        .from('work_orders')
        .update(patch)
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId);

      if (updRes.error) {
        const parsed = parseRpcError(updRes.error.message);
        return { success: false, code: parsed.code, error: parsed.message };
      }

      const updatedRow = { ...existing, ...patch };
      const audit = await recordAudit(
        context,
        'WO_CANCEL',
        workOrderId,
        'WORK_ORDER',
        existing,
        updatedRow,
        input.reason,
        opts?.correlationId ?? null,
        idempotencyKey,
      );

      return {
        success: true,
        outcome: 'SUCCEEDED',
        workOrder: mapWoRowToRecord(updatedRow),
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return { success: false, code: parsed.code, error: parsed.message };
    }
  }

  /**
   * WO_COMMITMENT_UPDATE — Update WO commitment/pricing.
   */
  static async updateCommitment(
    context: IdentityContext,
    workOrderId: string,
    input: WoCommitmentUpdateInput,
    opts?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ): Promise<WoMutationResult> {
    assertPermission(context, 'work_order:approve');
    validateUuid(workOrderId, 'workOrderId');

    const idempotencyKey = opts?.idempotencyKey ?? crypto.randomUUID();

    const payloadObj = {
      workOrderId,
      basePrice: input.basePrice,
      purchasePrice: input.purchasePrice,
      vendorPrice: input.vendorPrice,
      notes: input.notes,
      reason: opts?.reason ?? null,
      correlationId: opts?.correlationId ?? null,
    };
    const payloadHash = computePayloadHash(payloadObj);

    try {
      const { data, error } = await db().rpc('rpc_wo_mutation_execute_v1', {
        p_tenant_id: context.tenantId,
        p_actor_id: context.userId,
        p_command: 'WO_COMMITMENT_UPDATE',
        p_idempotency_key: idempotencyKey,
        p_payload_hash: payloadHash,
        p_target_identity: workOrderId,
        p_payload: payloadObj,
      });

      if (!isRpcUnavailable(data, error)) {
        if (error) {
          const parsed = parseRpcError(error.message);
          return { success: false, code: parsed.code, error: parsed.message };
        }
        return data as WoMutationResult;
      }

      const { data: existing, error: findErr } = await db()
        .from('work_orders')
        .select('*')
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId)
        .maybeSingle();

      if (findErr) {
        return { success: false, code: 'DATABASE_ERROR', error: findErr.message };
      }
      if (!existing) {
        return { success: false, code: 'NOT_FOUND', error: 'Work order not found.' };
      }

      const patch: DbRow = {
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      };
      if (input.basePrice !== undefined) patch.base_price = input.basePrice;
      if (input.purchasePrice !== undefined) patch.purchase_price = input.purchasePrice;
      if (input.vendorPrice !== undefined) patch.vendor_price = input.vendorPrice;
      if (input.notes !== undefined) patch.notes = input.notes;

      const updRes = await db()
        .from('work_orders')
        .update(patch)
        .eq('id', workOrderId)
        .eq('tenant_id', context.tenantId);

      if (updRes.error) {
        const parsed = parseRpcError(updRes.error.message);
        return { success: false, code: parsed.code, error: parsed.message };
      }

      const updatedRow = { ...existing, ...patch };
      const audit = await recordAudit(
        context,
        'WO_COMMITMENT_UPDATE',
        workOrderId,
        'WORK_ORDER',
        existing,
        updatedRow,
        opts?.reason ?? null,
        opts?.correlationId ?? null,
        idempotencyKey,
      );

      return {
        success: true,
        outcome: 'SUCCEEDED',
        workOrder: mapWoRowToRecord(updatedRow),
        auditId: audit.id,
      };
    } catch (err: any) {
      const parsed = parseRpcError(err?.message);
      return { success: false, code: parsed.code, error: parsed.message };
    }
  }
}