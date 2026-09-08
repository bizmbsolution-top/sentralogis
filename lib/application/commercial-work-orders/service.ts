/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/service.ts
 *
 * Application service for the Commercial Work Order boundary.
 *
 * Flow (mandate §1):
 *   IdentityContext (U-01) → assertPermission (U-02) → validation →
 *   U-03 Engagement Resolve-or-Create → application view.
 *
 * NON-GOALS enforced by construction: this service writes ONLY through the
 * U-03 bridge (which inserts commercial_work_orders). It never touches
 * job_orders, wo_items, service_requests, capability bindings, or any SBU
 * execution table (§21–§24).
 *
 * TRANSACTIONALITY (§29): engagement resolution and work-order creation are
 * the SAME canonical INSERT performed atomically inside U-03 — no second
 * write exists, so no partial-state window is possible. No extra transaction
 * complexity is introduced.
 *
 * IDEMPOTENCY (§25): business uniqueness suffices. The partial unique index
 * uq_com_wo_open_per_customer guarantees one OPEN work order per
 * (tenant, customer); repeated POSTs resolve it instead of duplicating.
 * No Idempotency-Key mechanism is required — documented in the U-04 report.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import {
  resolveOrCreateEngagement,
  mapRowToEngagement,
} from '@/lib/application/engagement/engagement-bridge';
import type { EngagementResult } from '@/lib/application/engagement/types';
import { getWorkOrderRepository } from './repository';
import type { WorkOrderRow } from './repository';
import {
  CreateWorkOrderCommand,
  CreateWorkOrderResult,
  ListWorkOrdersResult,
  WorkOrderView,
  WorkOrderError,
  ListWorkOrdersFilters,
} from './types';
import { parseCreateCommand } from './validation';

/* ------------------------------------------------------------------ */
/*  Row → API view projection (no raw SELECT * leakage, §15)           */
/* ------------------------------------------------------------------ */

function toView(row: WorkOrderRow): WorkOrderView {
  return {
    id: row.id,
    woNumber: row.wo_number,
    customerId: row.customer_id,
    status: row.status as WorkOrderView['status'],
    orderDate: row.order_date,
    targetFulfillmentDate: row.target_fulfillment_date,
    currency: row.currency,
    contractReference: row.contract_reference,
    createdAt: row.created_at,
  };
}

function engagementRowToRow(eng: ReturnType<typeof mapRowToEngagement>): WorkOrderRow {
  return {
    id: eng.id,
    tenant_id: eng.tenantId,
    wo_number: eng.woNumber,
    customer_id: eng.customerId,
    status: eng.status,
    order_date: eng.orderDate,
    target_fulfillment_date: eng.targetFulfillmentDate,
    currency: eng.currency,
    contract_reference: eng.contractReference,
    created_at: eng.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/*  POST — create / resolve                                            */
/* ------------------------------------------------------------------ */

/**
 * Create or resolve the canonical Commercial Work Order for a customer.
 *
 * @param ctx    trusted identity context (U-01/U-02)
 * @param body   raw request body (validated here, never trusted)
 * @throws {IdentityResolutionError} 401/403
 * @throws {WorkOrderError} 400 validation · 404 cross-tenant reference (non-leaking)
 *         · 409 customer/engagement contradiction
 * @throws {EngagementError} per U-03 contract
 */
export async function createWorkOrder(
  ctx: IdentityContext,
  body: unknown,
): Promise<CreateWorkOrderResult> {
  // ---- Gate: authorization (U-02) ----
  assertPermission(ctx, 'commercial:manage');

  // ---- Validate command BEFORE any database mutation (§28) ----
  const command: CreateWorkOrderCommand = parseCreateCommand(body);

  const repo = getWorkOrderRepository();

  // ---- Explicit engagement reference: tenant-scoped consistency checks ----
  if (command.engagementId) {
    const ref = await repo.findEngagementById(ctx.tenantId, command.engagementId);
    if (!ref) {
      // Non-leaking: same answer whether the id exists elsewhere or not (§9/§27).
      throw new WorkOrderError(
        'NOT_FOUND',
        404,
        'Referenced work order was not found in your tenant.',
      );
    }
    if (ref.customer_id !== command.customerId) {
      throw new WorkOrderError(
        'ENGAGEMENT_CUSTOMER_MISMATCH',
        409,
        'Referenced work order belongs to a different customer.',
      );
    }
  }

  // ---- U-03 bridge: the single authoritative resolve-or-create path ----
  const outcome: EngagementResult = await resolveOrCreateEngagement(
    {
      customerId: command.customerId,
      contractReference: command.contractReference ?? null,
      targetFulfillmentDate: command.targetFulfillmentDate ?? null,
      commercialNotes: command.commercialNotes ?? null,
      currency: command.currency,
    },
    ctx,
  );

  // ---- Supplied-reference conflict check (post-resolution, §11/§12) ----
  if (command.engagementId && outcome.engagement.id !== command.engagementId) {
    throw new WorkOrderError(
      'ENGAGEMENT_REFERENCE_CONFLICT',
      409,
      'The resolved open work order does not match the referenced engagement.',
    );
  }

  return {
    workOrder: toView(engagementRowToRow(outcome.engagement)),
    created: outcome.created,
  };
}

/* ------------------------------------------------------------------ */
/*  GET — single                                                       */
/* ------------------------------------------------------------------ */

export async function getWorkOrder(ctx: IdentityContext, id: string): Promise<WorkOrderView> {
  assertPermission(ctx, 'commercial:read');

  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
    throw new WorkOrderError('VALIDATION_FAILED', 400, 'id must be a valid UUID.');
  }

  const repo = getWorkOrderRepository();
  const row = await repo.findEngagementById(ctx.tenantId, id);
  if (!row) {
    throw new WorkOrderError('NOT_FOUND', 404, 'Work order was not found in your tenant.');
  }
  return toView(row);
}

/* ------------------------------------------------------------------ */
/*  GET — list                                                         */
/* ------------------------------------------------------------------ */

export async function listWorkOrders(
  ctx: IdentityContext,
  filters: ListWorkOrdersFilters,
): Promise<ListWorkOrdersResult> {
  assertPermission(ctx, 'commercial:read');

  const repo = getWorkOrderRepository();
  const { rows, total } = await repo.listEngagements(ctx.tenantId, filters);
  return { data: rows.map(toView), meta: { limit: filters.limit, offset: filters.offset, total } };
}
