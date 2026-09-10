/**
 * Sentralogis — Phase 4B / U-13
 * lib/sales-order/service.ts
 *
 * Canonical Sales Order domain authority (ADR-034 .. ADR-038).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01),
 *   never from client input (a client-supplied tenant header or payload is
 *   rejected).
 * - Authorization via assertPermission (U-02) — commercial:manage.
 * - SO number allocated ONLY by the canonical next_sales_order() RPC (ADR-035);
 *   no client generation, no SELECT MAX + increment.
 * - SO PK is a DB-generated UUID; never client-generated.
 * - createSalesOrder validates Engagement ownership and Cross-tenant Safety.
 * - Idempotency: optional idempotency_key with UNIQUE(tenant_id, key);
 *   INSERT + catch unique_violation + re-select (consistent with engagement
 *   resolve-or-create). The SO number is NOT used as an idempotency key.
 * - ADR-037 (many SO -> one WO forbidden) and ADR-036 (SO -> operational)
 *   are enforced here: no operation may assign a SO to a WO that already has a
 *   different SO ownership, and SO never directly creates a JO. Physical
 *   fulfillment composition is deferred to the Fulfillment phase.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import {
  SalesOrder,
  SalesOrderStatus,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  CreateSalesOrderResult,
  EDITABLE_SO_STATUSES,
  SalesOrderError,
  SO_ACTIVE_STATUSES,
} from './types';
import { createSOLineItem, listSOLineItemsBySO, _setSalesOrderLineDbClient } from './line-repository';
import { resolvePricingAndCommit } from './line-service';
import type { PricingCapabilityType, PricingSide } from '../pricing/types';
import type { PriceSnapshot } from './line-types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface SalesOrderDbClient {
  from(table: string): {
    select(cols?: string): SalesOrderQueryChain;
    insert(row: DbRow): SalesOrderInsertChain;
    update(row: DbRow): SalesOrderUpdateChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface SalesOrderQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): SalesOrderQueryChain;
  in(col: string, vals: unknown[]): SalesOrderQueryChain;
  order(col: string, opts: { ascending: boolean }): SalesOrderQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface SalesOrderUpdateChain {
  eq(col: string, val: unknown): SalesOrderUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface SalesOrderInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

let _client: SalesOrderDbClient = supabaseAdmin as unknown as SalesOrderDbClient;

/**
 * Override the database client for testing.
 * Call with `null` to restore the production client.
 */
export function _setSalesOrderDbClient(client: SalesOrderDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as SalesOrderDbClient);
}

export { _setSalesOrderLineDbClient } from './line-repository';

function db(): SalesOrderDbClient {
  return _client;
}

// ============================================================================
// QUOTE → SO PRICE TRANSFER HELPERS (ADR-081)
// ============================================================================

function mapSbuToCapability(sbuType: string): PricingCapabilityType {
  switch (sbuType?.toUpperCase()) {
    case 'FORWARDING':
      return 'FORWARDING';
    case 'CLEARANCE':
    case 'CUSTOMS':
      return 'CUSTOMS';
    case 'TRUCKING':
      return 'TRUCKING';
    case 'WAREHOUSE':
      return 'WAREHOUSE';
    default:
      return 'FORWARDING';
  }
}

function buildPriceSnapshotFromQuoteItem(
  quoteItem: Record<string, unknown>,
  currency: string,
): PriceSnapshot {
  const unitPrice = Number(quoteItem.nego_price ?? quoteItem.unit_price) || 0;
  const quantity = Number(quoteItem.qty) || 0;
  const subtotal = Number(quoteItem.subtotal) || 0;

  return {
    source_rate_id: null,
    source_rate_version_id: null,
    unit_rate_snapshot: unitPrice,
    quantity_snapshot: quantity,
    currency_snapshot: currency,
    uom_snapshot: (quoteItem.uom as string) || 'Unit',
    calculated_amount: subtotal,
    snapshot_timestamp: new Date().toISOString(),
    charge_basis: (quoteItem.description as string) || 'QUOTE_LINE',
    pricing_side: 'SELL',
    rounding_precision: currency === 'IDR' ? 0 : 2,
    rounding_mode: 'HALF_UP',
    min_charge: null,
    max_charge: null,
    selection_explanation: `Transferred from Quote item ${quoteItem.id}`,
    calculation_inputs: {
      quotation_item_id: quoteItem.id,
      service_id: quoteItem.service_id,
      tax_percent: quoteItem.tax_percent,
    },
  };
}

// ============================================================================
// ROW -> SALES ORDER MAPPER
// ============================================================================

export function mapRowToSalesOrder(row: Record<string, unknown>): SalesOrder {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    engagementId: row.engagement_id as string,
    quoteId: (row.quote_id as string) ?? null,
    soNumber: row.so_number as string,
    status: row.status as SalesOrderStatus,
    orderDate: row.order_date as string,
    targetFulfillmentDate: (row.target_fulfillment_date as string) ?? null,
    currency: (row.currency as string) || 'IDR',
    totalAgreedRevenue: Number(row.total_agreed_revenue) || 0,
    paymentTermsDays: Number(row.payment_terms_days) || 30,
    incoterm: (row.incoterm as string) ?? null,
    commercialNotes: (row.commercial_notes as string) ?? null,
    versionNo: Number(row.version_no) || 1,
    confirmedAt: (row.confirmed_at as string) ?? null,
    cancelledAt: (row.cancelled_at as string) ?? null,
    cancelledReason: (row.cancelled_reason as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// ============================================================================
// ALLOCATE SO NUMBER (ADR-035) — SERVER-ONLY AUTHORITY
// ============================================================================

/**
 * Allocate the next canonical SO business number via next_sales_order() RPC.
 * This is the ONLY accepted path for SO number generation. It must never be
 * called from client code; it is invoked server-side within createSalesOrder.
 */
export async function allocateSalesOrderNumber(tenantId: string): Promise<string> {
  const { data, error } = await db().rpc('next_sales_order', { p_tenant_id: tenantId });
  if (error) {
    throw new SalesOrderError(
      'DATABASE_ERROR',
      400,
      `Failed to generate Sales Order number: ${error.message}`,
    );
  }
  return data as string;
}

// ============================================================================
// VALIDATE ENGAGEMENT (tenant ownership; ADR-034)
// ============================================================================

async function validateEngagement(
  tenantId: string,
  engagementId: string,
): Promise<{ id: string; customer_id: string; status: string }> {
  const { data, error } = await db()
    .from('commercial_work_orders')
    .select('id, customer_id, status')
    .eq('id', engagementId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new SalesOrderError(
      'ENGAGEMENT_NOT_FOUND',
      404,
      `Engagement ${engagementId} not found in tenant ${tenantId}.`,
    );
  }
  return data as unknown as { id: string; customer_id: string; status: string };
}

// ============================================================================
// VALIDATE QUOTE (tenant ownership; U-12 quote is CRM-only)
// ============================================================================

async function validateQuote(tenantId: string, quoteId: string): Promise<void> {
  const { data, error } = await db()
    .from('crm_quotations')
    .select('id')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new SalesOrderError(
      'QUOTE_NOT_FOUND',
      404,
      `Quote ${quoteId} not found in tenant ${tenantId}.`,
    );
  }
}

// ============================================================================
// CREATE SALES ORDER
// ============================================================================

/**
 * Create a canonical Sales Order (customer commercial commitment).
 *
 * ADR-034: parent Engagement (1:N) — required, tenant-owned.
 * ADR-035: so_number allocated server-side by next_sales_order(); never client.
 * ADR-036: creation does NOT start operational execution (fulfillment begins at
 *          confirm, and is a separate boundary).
 * Direct SO: quoteId is optional (no Lead/Deal/Quote required).
 * Idempotency: optional idempotency_key yields retry-safe semantics.
 *
 * @throws {IdentityResolutionError} 403 / 401 from U-01/U-02 gates.
 * @throws {SalesOrderError} 404/409/422 for domain errors.
 */
export async function createSalesOrder(
  input: CreateSalesOrderInput,
  context: IdentityContext,
): Promise<CreateSalesOrderResult> {
  // ---- GATE 1: Authorization (U-02) ----
  assertPermission(context, 'commercial:manage');

  // ---- GATE 2: Trusted tenant (U-01) — never from client ----
  const tenantId = context.tenantId;

  // ---- GATE 3: Engagement ownership (cross-tenant reject) ----
  await validateEngagement(tenantId, input.engagementId);

  // ---- GATE 4: Quote optional + ownership (cross-tenant reject) ----
  if (input.quoteId) {
    await validateQuote(tenantId, input.quoteId);
  }

  // ---- GATE 5: Allocate canonical number (ADR-035) ----
  const soNumber = await allocateSalesOrderNumber(tenantId);

  const insertPayload: DbRow = {
    tenant_id: tenantId,
    engagement_id: input.engagementId,
    quote_id: input.quoteId ?? null,
    so_number: soNumber,
    status: 'DRAFT',
    idempotency_key: input.idempotencyKey ?? null,
    order_date: input.orderDate ?? new Date().toISOString().split('T')[0],
    target_fulfillment_date: input.targetFulfillmentDate ?? null,
    currency: input.currency || 'IDR',
    total_agreed_revenue: input.totalAgreedRevenue ?? 0,
    payment_terms_days: input.paymentTermsDays ?? 30,
    incoterm: input.incoterm ?? null,
    commercial_notes: input.commercialNotes ?? null,
    version_no: 1,
    created_by: context.userId,
    updated_by: context.userId,
  };

  const { data, error } = await db()
    .from('sales_orders')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Either a concurrent identical idempotency_key won the race (safe retry),
      // or a truly duplicate so_number (should never happen with nextval). For
      // an idempotency retry, return the existing row with idempotency_key.
      if (input.idempotencyKey) {
        const existing = await findByTenantAndIdempotencyKey(tenantId, input.idempotencyKey);
        if (existing) return { salesOrder: existing, created: false };
      }
      throw new SalesOrderError(
        'UNIQUE_VIOLATION',
        409,
        `Failed to create Sales Order: ${error.message}`,
      );
    }
    throw new SalesOrderError(
      'DATABASE_ERROR',
      400,
      `Failed to create Sales Order: ${error.message}`,
    );
   }

if (!data) {
      throw new SalesOrderError(
        'DATABASE_ERROR',
        400,
        'Failed to create Sales Order: no data returned',
      );
    }

   // ---- GATE 6: Quote → SO line item transfer (ADR-081) ----
   let salesOrder = mapRowToSalesOrder(data);
  if (input.quoteId) {
    const quote = await db()
      .from('crm_quotations')
      .select('status')
      .eq('id', input.quoteId)
      .eq('tenant_id', tenantId)
      .single();

    if (quote.error || !quote.data || (quote.data.status as string) !== 'ACCEPTED') {
      throw new SalesOrderError(
        'QUOTE_NOT_ACCEPTED',
        422,
        `Quote ${input.quoteId} is not in ACCEPTED status.`,
      );
    }

    const { data: quoteItems, error: quoteItemsError } = await db()
      .from('crm_quotation_items')
      .select('*')
      .eq('quotation_id', input.quoteId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (quoteItemsError || !quoteItems || quoteItems.length === 0) {
      throw new SalesOrderError(
        'QUOTE_NO_ITEMS',
        422,
        `Quote ${input.quoteId} has no line items.`,
      );
    }

    const existingLines = await listSOLineItemsBySO(context, salesOrder.id);
    if (existingLines.length === 0) {
      const currency = input.currency || 'IDR';

      const serviceIds = [...new Set(quoteItems.filter(qi => qi.service_id).map(qi => qi.service_id as string))];
      let serviceMap: Record<string, PricingCapabilityType> = {};
      if (serviceIds.length > 0) {
        const { data: services } = await db()
          .from('md_services')
          .select('id, sbu_type')
          .in('id', serviceIds);
        if (services) {
          for (const svc of services) {
            serviceMap[svc.id as string] = mapSbuToCapability(svc.sbu_type as string);
          }
        }
      }

      let lineTotal = 0;
      for (let i = 0; i < quoteItems.length; i++) {
        const quoteItem = quoteItems[i];
        const unitPrice = Number(quoteItem.nego_price ?? quoteItem.unit_price) || 0;
        const quantity = Number(quoteItem.qty) || 0;
        const lineItemTotal = unitPrice * quantity;

        await createSOLineItem(context, {
          salesOrderId: salesOrder.id,
          lineSequence: i + 1,
          sourceQuoteItemId: quoteItem.id as string,
          capabilityType: quoteItem.service_id ? (serviceMap[quoteItem.service_id as string] || 'FORWARDING') : 'FORWARDING',
          side: 'SELL',
          serviceDescription: (quoteItem.description as string) || 'Quote Line Item',
          quantity,
          unitOfMeasure: (quoteItem.uom as string) || 'Unit',
          currency,
          unitRate: unitPrice,
          lineTotal: lineItemTotal,
          priceSnapshot: buildPriceSnapshotFromQuoteItem(quoteItem, currency),
        });
        lineTotal += lineItemTotal;
      }

      await db()
        .from('sales_orders')
        .update({ total_agreed_revenue: lineTotal })
        .eq('id', salesOrder.id)
        .eq('tenant_id', tenantId)
        .select('*');

      salesOrder = await findById(tenantId, salesOrder.id);
    }
  }

  // ---- GATE 6B: Canonical pricing line items (ADR-082) ----
  if (!input.quoteId && input.lineItems && input.lineItems.length > 0) {
    const pricingResult = await resolvePricingAndCommit(context, salesOrder.id, input.lineItems);
    await db()
      .from('sales_orders')
      .update({ total_agreed_revenue: pricingResult.totalAmount })
      .eq('id', salesOrder.id)
      .eq('tenant_id', tenantId)
      .select('*');

    salesOrder = await findById(tenantId, salesOrder.id);
  }

  return { salesOrder, created: true };
}

async function findByTenantAndIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<SalesOrder | null> {
  const { data, error } = await db()
    .from('sales_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return mapRowToSalesOrder(data);
}

// ============================================================================
// UPDATE DRAFT
// ============================================================================

/**
 * Update a Sales Order while it remains in DRAFT.
 * Post-confirmation mutation is controlled (see confirm/cancel); arbitrary
 * client status values are rejected. ADR-036: draft edits are commercial-only.
 */
export async function updateDraftSalesOrder(
  salesOrderId: string,
  input: UpdateSalesOrderInput,
  context: IdentityContext,
): Promise<SalesOrder> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const current = await findById(tenantId, salesOrderId);

  if (!EDITABLE_SO_STATUSES.includes(current.status)) {
    throw new SalesOrderError(
      'NOT_EDITABLE',
      422,
      `Sales Order ${salesOrderId} is not editable (status=${current.status}).`,
    );
  }

  const updatePayload: DbRow = {
    ...(input.targetFulfillmentDate !== undefined ? { target_fulfillment_date: input.targetFulfillmentDate } : {}),
    ...(input.currency !== undefined ? { currency: input.currency } : {}),
    ...(input.totalAgreedRevenue !== undefined ? { total_agreed_revenue: input.totalAgreedRevenue } : {}),
    ...(input.paymentTermsDays !== undefined ? { payment_terms_days: input.paymentTermsDays } : {}),
    ...(input.incoterm !== undefined ? { incoterm: input.incoterm } : {}),
    ...(input.commercialNotes !== undefined ? { commercial_notes: input.commercialNotes } : {}),
    version_no: (current.versionNo || 1) + 1,
    updated_by: context.userId,
  };

  await db()
    .from('sales_orders')
    .update(updatePayload)
    .eq('id', salesOrderId)
    .eq('tenant_id', tenantId)
    .select('*');

  const updated = await findById(tenantId, salesOrderId);
  return updated;
}

// ============================================================================
// CONFIRM (transition DRAFT -> CONFIRMED)
// ============================================================================

/**
 * Confirm a Sales Order. Authorization: commercial:manage.
 * ADR-036: confirm is the explicit commercial commitment; it does NOT itself
 * create operational records. Any operational composition occurs via the
 * Fulfillment boundary, not in U-13.
 */
export async function confirmSalesOrder(
  salesOrderId: string,
  context: IdentityContext,
): Promise<SalesOrder> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const current = await findById(tenantId, salesOrderId);
  if (current.status !== 'DRAFT') {
    throw new SalesOrderError(
      'INVALID_STATUS_TRANSITION',
      422,
      `Cannot confirm Sales Order in status=${current.status}; only DRAFT may be confirmed.`,
    );
  }

  await db()
    .from('sales_orders')
    .update({
      status: 'CONFIRMED',
      confirmed_at: new Date().toISOString(),
      version_no: (current.versionNo || 1) + 1,
      updated_by: context.userId,
    })
    .eq('id', salesOrderId)
    .eq('tenant_id', tenantId)
    .select('*');

  return findById(tenantId, salesOrderId);
}

// ============================================================================
// CANCEL
// ============================================================================

/**
 * Cancel a Sales Order that has NOT reached a terminal/fulfilled state.
 * ADR-036/§25: controlled amendment — cancellation is distinct from arbitrary
 * mutation and records a reason.
 */
export async function cancelSalesOrder(
  salesOrderId: string,
  context: IdentityContext,
  reason?: string,
): Promise<SalesOrder> {
  assertPermission(context, 'commercial:manage');
  const tenantId = context.tenantId;

  const current = await findById(tenantId, salesOrderId);
  if (SO_ACTIVE_STATUSES.indexOf(current.status) === -1) {
    throw new SalesOrderError(
      'INVALID_STATUS_TRANSITION',
      422,
      `Cannot cancel Sales Order in terminal status=${current.status}.`,
    );
  }

  await db()
    .from('sales_orders')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason ?? null,
      version_no: (current.versionNo || 1) + 1,
      updated_by: context.userId,
    })
    .eq('id', salesOrderId)
    .eq('tenant_id', tenantId)
    .select('*');

  return findById(tenantId, salesOrderId);
}

// ============================================================================
// FETCH
// ============================================================================

export async function findById(tenantId: string, salesOrderId: string): Promise<SalesOrder> {
  const { data, error } = await db()
    .from('sales_orders')
    .select('*')
    .eq('id', salesOrderId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new SalesOrderError(
      'SALES_ORDER_NOT_FOUND',
      404,
      `Sales Order ${salesOrderId} not found in tenant ${tenantId}.`,
    );
  }
  return mapRowToSalesOrder(data);
}

/**
 * Fetch a Sales Order authorized by tenant from IdentityContext (U-01/U-02).
 * Asserts commercial:read. Cross-tenant access is impossible (tenant filters).
 */
export async function findSalesOrderById(
  context: IdentityContext,
  salesOrderId: string,
): Promise<SalesOrder> {
  assertPermission(context, 'commercial:read');
  return findById(context.tenantId, salesOrderId);
}

export async function listByEngagement(
  tenantId: string,
  engagementId: string,
): Promise<SalesOrder[]> {
  const { data, error } = await db()
    .from('sales_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new SalesOrderError(
      'DATABASE_ERROR',
      400,
      `Failed to list Sales Orders: ${error.message}`,
    );
  }
  return (data || []).map((r) => mapRowToSalesOrder(r as DbRow));
}

/**
 * List Sales Orders for an Engagement, authorized by tenant from IdentityContext.
 * Asserts commercial:read (U-02). Engagement ownership is verified so a caller
 * cannot enumerate another tenant's engagement's orders.
 */
export async function listSalesOrdersForEngagement(
  context: IdentityContext,
  engagementId: string,
): Promise<SalesOrder[]> {
  assertPermission(context, 'commercial:read');
  const tenantId = context.tenantId;
  await validateEngagement(tenantId, engagementId);
  return listByEngagement(tenantId, engagementId);
}
