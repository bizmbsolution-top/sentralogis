/**
 * Sentralogis — Phase 4B / U-15
 * lib/fulfillment/service.ts
 *
 * Canonical Fulfillment domain authority (ADR-039 .. ADR-044).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01),
 *   never from client input (a client-supplied tenant header or payload is
 *   rejected).
 * - Authorization via assertPermission (U-02) — commercial:manage / commercial:read.
 * - Fulfillment number allocated ONLY by the canonical next_fulfillment_number()
 *   RPC (ADR-041); no client generation, no SELECT MAX + increment.
 * - Fulfillment PK is a DB-generated UUID; never client-generated.
 * - createFulfillment validates Sales Order ownership, SO status=CONFIRMED,
 *   and Cross-tenant Safety.
 * - Idempotency: optional idempotency_key with UNIQUE(tenant_id, key);
 *   INSERT + catch unique_violation + re-select (consistent with SO/engagement).
 *   The Fulfillment number is NOT used as an idempotency key.
 * - ADR-042/043/044 enforced: revisions, state transitions, commercial boundary.
 * - Fulfillment does NOT directly write work_orders/wo_items/job_orders/
 *   shp_shipments/cus_declarations/svc_service_requests. Composition only.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import {
  Fulfillment,
  FulfillmentStatus,
  FulfillmentAllocation,
  AllocationStatus,
  CapabilityType,
  CreateFulfillmentInput,
  CreateFulfillmentAllocationInput,
  UpdateFulfillmentInput,
  AddFulfillmentAllocationInput,
  UpdateAllocationProgressInput,
  FulfillmentActionInput,
  FulfillmentAction,
  CreateFulfillmentResult,
  FulfillmentComposition,
  EDITABLE_FULFILLMENT_STATUSES,
  FULFILLMENT_ACTIVE_STATUSES,
  FULFILLMENT_TRANSITIONS,
} from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface FulfillmentDbClient {
  from(table: string): {
    select(cols?: string): FulfillmentQueryChain;
    insert(row: DbRow | DbRow[]): FulfillmentInsertChain;
    update(row: DbRow): FulfillmentUpdateChain;
    delete(): FulfillmentDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface FulfillmentQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): FulfillmentQueryChain;
  in(col: string, vals: unknown[]): FulfillmentQueryChain;
  order(col: string, opts: { ascending: boolean }): FulfillmentQueryChain;
  limit(count: number): FulfillmentQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface FulfillmentUpdateChain {
  eq(col: string, val: unknown): FulfillmentUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface FulfillmentInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface FulfillmentDeleteChain {
  eq(col: string, val: unknown): FulfillmentDeleteChain;
  select(cols?: string): Promise<DbListResult>;
}

let _client: FulfillmentDbClient = supabaseAdmin as unknown as FulfillmentDbClient;

/**
 * Override the database client for testing.
 * Call with `null` to restore the production client.
 */
export function _setFulfillmentDbClient(client: FulfillmentDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as FulfillmentDbClient);
}

function db(): FulfillmentDbClient {
  return _client;
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapRowToFulfillment(row: Record<string, unknown>): Fulfillment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    salesOrderId: row.sales_order_id as string,
    fulfillmentNumber: row.fulfillment_number as string,
    revisionNo: Number(row.revision_no) || 1,
    status: row.status as FulfillmentStatus,
    idempotencyKey: (row.idempotency_key as string) ?? null,
    targetFulfillmentDate: (row.target_fulfillment_date as string) ?? null,
    versionNo: Number(row.version_no) || 1,
    cancelledAt: (row.cancelled_at as string) ?? null,
    cancelledReason: (row.cancelled_reason as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

function mapRowToAllocation(row: Record<string, unknown>): FulfillmentAllocation {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    fulfillmentId: row.fulfillment_id as string,
    capabilityType: row.capability_type as CapabilityType,
    capabilityBindingId: (row.capability_binding_id as string) ?? null,
    allocatedQuantity: Number(row.allocated_quantity) || 0,
    deliveredQuantity: Number(row.delivered_quantity) || 0,
    status: row.status as AllocationStatus,
    shipmentId: (row.shipment_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================================================
// ALLOCATE FULFILLMENT NUMBER (ADR-041) — SERVER-ONLY AUTHORITY
// ============================================================================

/**
 * Allocate the next canonical Fulfillment business number via next_fulfillment_number() RPC.
 * This is the ONLY accepted path for Fulfillment number generation. It must never be
 * called from client code; it is invoked server-side within createFulfillment.
 */
export async function allocateFulfillmentNumber(tenantId: string): Promise<string> {
  const { data, error } = await db().rpc('next_fulfillment_number', { p_tenant_id: tenantId });
  if (error) {
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to generate Fulfillment number: ${error.message}`,
    );
  }
  return data as string;
}

// ============================================================================
// VALIDATE SALES ORDER (tenant ownership; CONFIRMED status; ADR-036/042)
// ============================================================================

async function validateSalesOrder(
  tenantId: string,
  salesOrderId: string,
): Promise<{ id: string; status: string; customer_id: string }> {
  const { data, error } = await db()
    .from('sales_orders')
    .select('id, status, customer_id')
    .eq('id', salesOrderId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new FulfillmentError(
      'SALES_ORDER_NOT_FOUND',
      404,
      `Sales Order ${salesOrderId} not found in tenant ${tenantId}.`,
    );
  }
  if (data.status !== 'CONFIRMED') {
    throw new FulfillmentError(
      'SALES_ORDER_NOT_CONFIRMED',
      422,
      `Sales Order ${salesOrderId} must be CONFIRMED to create a Fulfillment (current: ${data.status}).`,
    );
  }
  return data as unknown as { id: string; status: string; customer_id: string };
}

async function validateCapabilityBinding(
  tenantId: string,
  bindingId: string,
): Promise<void> {
  const { data, error } = await db()
    .from('commercial_capability_bindings')
    .select('id')
    .eq('id', bindingId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new FulfillmentError(
      'CAPABILITY_BINDING_NOT_FOUND',
      404,
      `Capability Binding ${bindingId} not found in tenant ${tenantId}.`,
    );
  }
}

async function validateShipment(
  tenantId: string,
  shipmentId: string,
): Promise<void> {
  const { data, error } = await db()
    .from('shp_shipments')
    .select('id')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new FulfillmentError(
      'SHIPMENT_NOT_FOUND',
      404,
      `Shipment ${shipmentId} not found in tenant ${tenantId}.`,
    );
  }
}

// ============================================================================
// CREATE FULFILLMENT
// ============================================================================

/**
 * Create a canonical Fulfillment composition for a CONFIRMED Sales Order.
 *
 * ADR-042: parent Sales Order (1:N revisions) — required, tenant-owned.
 * ADR-041: fulfillment_number allocated server-side by next_fulfillment_number(); never client.
 * ADR-036/039: creation does NOT start operational execution; composition only.
 * ADR-037/039: NO operational records created here (no WO, JO, Shipment, SR).
 * Idempotency: optional idempotency_key yields retry-safe semantics.
 *
 * @throws {IdentityResolutionError} 403 / 401 from U-01/U-02 gates.
 * @throws {FulfillmentError} 404/409/422 for domain errors.
 */
export async function createFulfillment(
  input: CreateFulfillmentInput,
  context: IdentityContext,
): Promise<CreateFulfillmentResult> {
  // ---- GATE 1: Authorization (U-02) ----
  assertPermission(context, 'commercial:manage');

  // ---- GATE 2: Trusted tenant (U-01) — never from client ----
  const tenantId = context.tenantId;

  // ---- GATE 3: Sales Order ownership + CONFIRMED (ADR-036 boundary) ----
  await validateSalesOrder(tenantId, input.salesOrderId);

  // ---- GATE 4: Validate capability bindings if provided ----
  if (input.allocations) {
    for (const alloc of input.allocations) {
      if (alloc.capabilityBindingId) {
        await validateCapabilityBinding(tenantId, alloc.capabilityBindingId);
      }
      if (alloc.shipmentId) {
        await validateShipment(tenantId, alloc.shipmentId);
      }
    }
  }

  // ---- GATE 5: Allocate canonical number (ADR-041) ----
  const fulfillmentNumber = await allocateFulfillmentNumber(tenantId);

  // ---- GATE 6: Determine next revision number for this SO ----
  const { data: latestRev } = await db()
    .from('fulfillments')
    .select('revision_no')
    .eq('sales_order_id', input.salesOrderId)
    .eq('tenant_id', tenantId)
    .order('revision_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  const revisionNo = latestRev ? (Number(latestRev.revision_no) || 0) + 1 : 1;

  const now = new Date().toISOString();
  const fulfillmentPayload: DbRow = {
    tenant_id: tenantId,
    sales_order_id: input.salesOrderId,
    fulfillment_number: fulfillmentNumber,
    revision_no: revisionNo,
    status: 'PLANNED',
    idempotency_key: input.idempotencyKey ?? null,
    target_fulfillment_date: input.targetFulfillmentDate ?? null,
    version_no: 1,
    created_by: context.userId,
    updated_by: context.userId,
  };

  const { data: fulfillmentData, error: fulfillmentError } = await db()
    .from('fulfillments')
    .insert(fulfillmentPayload)
    .select('*')
    .single();

  if (fulfillmentError) {
    if (fulfillmentError.code === '23505') {
      if (input.idempotencyKey) {
        const existing = await findByTenantAndIdempotencyKey(tenantId, input.idempotencyKey);
        if (existing) return { fulfillment: existing, created: false };
      }
      throw new FulfillmentError(
        'UNIQUE_VIOLATION',
        409,
        `Failed to create Fulfillment: ${fulfillmentError.message}`,
      );
    }
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to create Fulfillment: ${fulfillmentError.message}`,
    );
  }

  const fulfillment = mapRowToFulfillment(fulfillmentData as DbRow);

  // ---- Create initial allocations if provided ----
  if (input.allocations && input.allocations.length > 0) {
    const allocationPayloads = input.allocations.map((a) => ({
      tenant_id: tenantId,
      fulfillment_id: fulfillment.id,
      capability_type: a.capabilityType,
      capability_binding_id: a.capabilityBindingId ?? null,
      allocated_quantity: a.allocatedQuantity,
      delivered_quantity: 0,
      status: 'PLANNED',
      shipment_id: a.shipmentId ?? null,
    }));

    try {
      // Bulk insert — select to trigger execution and get error feedback
      const { error: allocError } = await db()
        .from('fulfillment_allocations')
        .insert(allocationPayloads as unknown as DbRow)
        .select('id')
        .maybeSingle();

      // For bulk inserts, maybeSingle may return null data with no error — that's OK
      if (allocError) {
        // Rollback fulfillment creation on allocation failure (atomic composition)
        await db().from('fulfillments').delete().eq('id', fulfillment.id);
        throw new FulfillmentError(
          'DATABASE_ERROR',
          400,
          `Failed to create Fulfillment allocations: ${allocError.message}`,
        );
      }
    } catch (e) {
      if (e instanceof FulfillmentError) throw e;
      // Rollback fulfillment creation on allocation failure
      await db().from('fulfillments').delete().eq('id', fulfillment.id);
      throw new FulfillmentError(
        'DATABASE_ERROR',
        400,
        `Failed to create Fulfillment allocations: ${String(e)}`,
      );
    }
  }

  return { fulfillment, created: true };
}

async function findByTenantAndIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<Fulfillment | null> {
  const { data, error } = await db()
    .from('fulfillments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error || !data) return null;
  return mapRowToFulfillment(data);
}

// ============================================================================
// FETCH
// ============================================================================

export async function findById(tenantId: string, fulfillmentId: string): Promise<Fulfillment> {
  const { data, error } = await db()
    .from('fulfillments')
    .select('*')
    .eq('id', fulfillmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new FulfillmentError(
      'FULFILLMENT_NOT_FOUND',
      404,
      `Fulfillment ${fulfillmentId} not found in tenant ${tenantId}.`,
    );
  }
  return mapRowToFulfillment(data);
}

/**
 * Fetch a Fulfillment authorized by tenant from IdentityContext (U-01/U-02).
 * Asserts commercial:read. Cross-tenant access is impossible (tenant filters).
 */
export async function findFulfillmentById(
  arg1: IdentityContext | string,
  arg2?: string | IdentityContext,
): Promise<Fulfillment> {
  const context = (typeof arg1 === 'object' ? arg1 : arg2) as IdentityContext;
  const fulfillmentId = (typeof arg1 === 'string' ? arg1 : arg2) as string;
  assertPermission(context, 'commercial:read');
  return findById(context.tenantId, fulfillmentId);
}

/**
 * Fetch Fulfillment with its allocations (composition view).
 */
export async function findFulfillmentCompositionById(
  arg1: IdentityContext | string,
  arg2?: string | IdentityContext,
): Promise<FulfillmentComposition> {
  const context = (typeof arg1 === 'object' ? arg1 : arg2) as IdentityContext;
  const fulfillmentId = (typeof arg1 === 'string' ? arg1 : arg2) as string;
  assertPermission(context, 'commercial:read');
  const fulfillment = await findById(context.tenantId, fulfillmentId);

  const { data, error } = await db()
    .from('fulfillment_allocations')
    .select('*')
    .eq('fulfillment_id', fulfillmentId)
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to fetch allocations: ${error.message}`,
    );
  }

  return {
    fulfillment,
    allocations: (data || []).map(mapRowToAllocation),
  };
}

/**
 * List Fulfillments for a Sales Order (all revisions).
 */
export async function listFulfillmentsBySalesOrder(
  arg1: IdentityContext | string,
  arg2?: string | IdentityContext,
): Promise<Fulfillment[]> {
  const context = (typeof arg1 === 'object' ? arg1 : arg2) as IdentityContext;
  const salesOrderId = (typeof arg1 === 'string' ? arg1 : arg2) as string;
  assertPermission(context, 'commercial:read');
  const tenantId = context.tenantId;
  await validateSalesOrder(tenantId, salesOrderId);

  const { data, error } = await db()
    .from('fulfillments')
    .select('*')
    .eq('sales_order_id', salesOrderId)
    .eq('tenant_id', tenantId)
    .order('revision_no', { ascending: true });

  if (error) {
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to list Fulfillments: ${error.message}`,
    );
  }
  return (data || []).map(mapRowToFulfillment);
}

// ============================================================================
// UPDATE DRAFT / PLANNED
// ============================================================================

export async function updatePlannedFulfillment(
  fulfillmentId: string,
  input: UpdateFulfillmentInput,
  context: IdentityContext,
): Promise<Fulfillment> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const current = await findById(tenantId, fulfillmentId);

  if (!EDITABLE_FULFILLMENT_STATUSES.includes(current.status)) {
    throw new FulfillmentError(
      'NOT_EDITABLE',
      422,
      `Fulfillment ${fulfillmentId} is not editable (status=${current.status}; only PLANNED allowed).`,
    );
  }

  const updatePayload: DbRow = {
    ...(input.targetFulfillmentDate !== undefined ? { target_fulfillment_date: input.targetFulfillmentDate } : {}),
    version_no: (current.versionNo || 1) + 1,
    updated_by: context.userId,
  };

  await db()
    .from('fulfillments')
    .update(updatePayload)
    .eq('id', fulfillmentId)
    .eq('tenant_id', tenantId)
    .select('*');

  return findById(tenantId, fulfillmentId);
}

// ============================================================================
// LIFECYCLE ACTIONS
// ============================================================================

export async function performFulfillmentAction(
  fulfillmentId: string,
  input: FulfillmentAction | FulfillmentActionInput,
  context: IdentityContext,
): Promise<Fulfillment> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const current = await findById(tenantId, fulfillmentId);
  const allowedNext = FULFILLMENT_TRANSITIONS[current.status] || [];

  const actionName: FulfillmentAction = typeof input === 'string' ? input : input?.action;
  const actionReason: string | undefined = typeof input === 'object' ? input?.reason : undefined;

  let targetStatus: FulfillmentStatus | null = null;

  switch (actionName) {
    case 'activate':
      if (!allowedNext.includes('ACTIVE')) {
        throw new FulfillmentError(
          'INVALID_STATUS_TRANSITION',
          422,
          `Cannot activate Fulfillment in status=${current.status}.`,
        );
      }
      targetStatus = 'ACTIVE';
      break;

    case 'cancel':
    case 'void':
      if (!allowedNext.includes('CANCELLED')) {
        throw new FulfillmentError(
          'INVALID_STATUS_TRANSITION',
          422,
          `Cannot cancel/void Fulfillment in status=${current.status}.`,
        );
      }
      targetStatus = 'CANCELLED';
      break;

    default:
      throw new FulfillmentError(
        'INVALID_STATUS_TRANSITION',
        400,
        `Unknown Fulfillment action: ${actionName}.`,
      );
  }

  const updatePayload: DbRow = {
    status: targetStatus,
    ...(targetStatus === 'CANCELLED' ? {
      cancelled_at: new Date().toISOString(),
      cancelled_reason: actionReason ?? null,
    } : {}),
    version_no: (current.versionNo || 1) + 1,
    updated_by: context.userId,
  };

  await db()
    .from('fulfillments')
    .update(updatePayload)
    .eq('id', fulfillmentId)
    .eq('tenant_id', tenantId)
    .select('*');

  return findById(tenantId, fulfillmentId);
}

// ============================================================================
// ALLOCATION MANAGEMENT (PLANNED state only)
// ============================================================================

export async function addFulfillmentAllocation(
  fulfillmentId: string,
  input: AddFulfillmentAllocationInput,
  context: IdentityContext,
): Promise<FulfillmentAllocation> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const fulfillment = await findById(tenantId, fulfillmentId);

  if (!EDITABLE_FULFILLMENT_STATUSES.includes(fulfillment.status)) {
    throw new FulfillmentError(
      'NOT_IN_PLANNED_STATE',
      422,
      `Cannot add allocation to Fulfillment in status=${fulfillment.status} (must be PLANNED).`,
    );
  }

  if (input.capabilityBindingId) {
    await validateCapabilityBinding(tenantId, input.capabilityBindingId);
  }
  if (input.shipmentId) {
    await validateShipment(tenantId, input.shipmentId);
  }

  const payload: DbRow = {
    tenant_id: tenantId,
    fulfillment_id: fulfillmentId,
    capability_type: input.capabilityType,
    capability_binding_id: input.capabilityBindingId ?? null,
    allocated_quantity: input.allocatedQuantity,
    delivered_quantity: 0,
    status: 'PLANNED',
    shipment_id: input.shipmentId ?? null,
  };

  const { data, error } = await db()
    .from('fulfillment_allocations')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to add allocation: ${error?.message ?? 'No data returned'}`,
    );
  }

  return mapRowToAllocation(data);
}

export async function updateAllocationProgress(
  allocationId: string,
  input: UpdateAllocationProgressInput,
  context: IdentityContext,
): Promise<FulfillmentAllocation> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const { data: current, error: findError } = await db()
    .from('fulfillment_allocations')
    .select('*, fulfillments!inner(status)')
    .eq('id', allocationId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (findError || !current) {
    throw new FulfillmentError(
      'FULFILLMENT_ALLOCATION_NOT_FOUND',
      404,
      `Allocation ${allocationId} not found in tenant ${tenantId}.`,
    );
  }

  const fulfillmentStatus = (current as any).fulfillments?.status as FulfillmentStatus;
  if (!FULFILLMENT_ACTIVE_STATUSES.includes(fulfillmentStatus)) {
    throw new FulfillmentError(
      'INVALID_STATUS_TRANSITION',
      422,
      `Cannot update allocation: parent Fulfillment not in active state (${fulfillmentStatus}).`,
    );
  }

  if (input.shipmentId) {
    await validateShipment(tenantId, input.shipmentId);
  }

  const newDelivered = Math.min(input.deliveredQuantity, Number(current.allocated_quantity));
  const currentAllocStatus = current.status as AllocationStatus;
  const newStatus: AllocationStatus = newDelivered >= Number(current.allocated_quantity)
    ? 'DELIVERED'
    : newDelivered > 0
      ? 'PARTIALLY_DELIVERED'
      : currentAllocStatus;

  const updatePayload: DbRow = {
    delivered_quantity: newDelivered,
    status: input.status ?? newStatus,
    ...(input.shipmentId !== undefined ? { shipment_id: input.shipmentId } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data: updatedRows, error } = await db()
    .from('fulfillment_allocations')
    .update(updatePayload)
    .eq('id', allocationId)
    .eq('tenant_id', tenantId)
    .select('*');

  const updatedRow = updatedRows?.[0] ?? null;

  if (error || !updatedRow) {
    throw new FulfillmentError(
      'DATABASE_ERROR',
      400,
      `Failed to update allocation progress: ${error?.message ?? 'No data returned'}`,
    );
  }

  // TODO: ADR-043 event emission (fulfillment.allocation.updated) - deferred to event wiring phase
  // Check if parent fulfillment should advance status (PARTIALLY_FULFILLED/FULFILLED)
  // This is deferred to SEA event consumption per ADR-043.

  return mapRowToAllocation(updatedRow);
}

// ============================================================================
// IMPORTS (at bottom to avoid circular)
// ============================================================================

import { FulfillmentError } from './types';