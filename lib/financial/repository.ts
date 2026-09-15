/**
 * Sentralogis — Phase 5D-2 / U-25
 * lib/financial/repository.ts
 *
 * Canonical Financial repository (ADR-064, U-25).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Financial records are append-only after commitment.
 * - Idempotent: duplicate requests return existing records.
 * - Immutable: committed records cannot be silently mutated.
 * - Invoice numbers are server-side authoritative (Math.random() outlawed).
 * - Duplicate prevention: one non-null billable_event_id → at most one invoice line.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import { assertInvoiceGenerationEnabled } from './feature-flags';
import type {
  BillableEvent,
  FinInvoice,
  FinInvoiceLine,
  FinArAp,
  FinAdjustment,
  CreateBillableEventInput,
  CreateInvoiceInput,
  CreateAdjustmentInput,
} from './types';
import { FinancialError } from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface FinancialDbClient {
  from(table: string): {
    select(cols?: string): FinancialQueryChain;
    insert(row: DbRow | DbRow[]): FinancialInsertChain;
    update(row: DbRow): FinancialUpdateChain;
    delete(): FinancialDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface FinancialQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): FinancialQueryChain;
  in(col: string, vals: unknown[]): FinancialQueryChain;
  order(col: string, opts: { ascending: boolean }): FinancialQueryChain;
  limit(count: number): FinancialQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface FinancialInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface FinancialUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): FinancialUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface FinancialDeleteChain {
  eq(col: string, val: unknown): FinancialDeleteChain;
  select(): Promise<DbListResult>;
}

let _client: FinancialDbClient = supabaseAdmin as unknown as FinancialDbClient;

/**
 * Override the database client for testing.
 * Call with `null` to restore the production client.
 * Internal testability seam only — not exposed through HTTP/API.
 */
export function _setFinancialDbClient(client: FinancialDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as FinancialDbClient);
}

function db(): FinancialDbClient {
  return _client;
}

// ============================================================================
// BILLABLE EVENT REPOSITORY
// ============================================================================

export async function createBillableEvent(
  ctx: IdentityContext,
  input: CreateBillableEventInput,
): Promise<BillableEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('fin_billable_events')
    .insert({
      tenant_id: ctx.tenantId,
      sales_order_id: input.salesOrderId,
      so_line_item_id: input.soLineItemId ?? null,
      source_quote_item_id: input.sourceQuoteItemId ?? null,
      capability_type: input.capabilityType,
      side: input.side,
      event_type: input.eventType ?? 'FULFILLMENT_MILESTONE',
      description: input.description,
      quantity: input.quantity,
      unit_of_measure: input.unitOfMeasure,
      currency: input.currency,
      unit_amount: input.unitAmount,
      total_amount: input.totalAmount,
      price_snapshot_id: input.priceSnapshotId ?? null,
      status: 'PENDING',
      idempotency_key: input.idempotencyKey ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' && input.idempotencyKey) {
      const { data: existing } = await db()
        .from('fin_billable_events')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('idempotency_key', input.idempotencyKey)
        .maybeSingle();
      if (existing) {
        return existing as unknown as BillableEvent;
      }
    }
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to create billable event: ${error.message}`);
  }

  return data as unknown as BillableEvent;
}

export async function getBillableEventById(
  ctx: IdentityContext,
  eventId: string,
): Promise<BillableEvent | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_billable_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch billable event: ${error.message}`);
  }

  return data as unknown as BillableEvent | null;
}

export async function listBillableEventsBySO(
  ctx: IdentityContext,
  salesOrderId: string,
): Promise<BillableEvent[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_billable_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sales_order_id', salesOrderId)
    .order('event_timestamp', { ascending: true });

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to list billable events: ${error.message}`);
  }

  return (data ?? []) as unknown as BillableEvent[];
}

// ============================================================================
// INVOICE REPOSITORY
// ============================================================================

export async function createInvoice(
  ctx: IdentityContext,
  input: CreateInvoiceInput,
): Promise<{ invoice: FinInvoice; lines: FinInvoiceLine[]; billableEventIds: string[] }> {
  assertPermission(ctx, 'commercial:manage');

  // GAP-1: FIN_INVOICE capability gate — fail-closed, server-side.
  // The flag controls the financial mutation capability, not merely UI visibility.
  assertInvoiceGenerationEnabled();

  // 1. Validate and fetch all billable events with their committed financial values
  //    This ensures financial integrity - we copy committed values, never recalculate.
  if (!input.billableEventIds || input.billableEventIds.length === 0) {
    throw new FinancialError('INVALID_INPUT', 400, 'At least one billable event ID is required');
  }

  // Fetch all billable events in a single query for efficiency
  const { data: billableEvents, error: beError } = await db()
    .from('fin_billable_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .in('id', input.billableEventIds);

  if (beError) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch billable events: ${beError.message}`);
  }

  if (!billableEvents || billableEvents.length !== input.billableEventIds.length) {
    throw new FinancialError('BILLABLE_EVENT_NOT_FOUND', 404, 'One or more billable events not found or do not belong to tenant');
  }

  // Validate all billable events are invoiceable (PENDING status)
  for (const be of billableEvents) {
    if (be.status !== 'PENDING') {
      throw new FinancialError('INVALID_TRANSITION', 409, `Billable event ${be.id} is not in PENDING status (current: ${be.status})`);
    }
  }

  // 2. Resolve bill-to lineage from the first billable event's sales order
  //    sales_orders.engagement_id → commercial_work_orders.customer_id
  const firstBe = billableEvents[0];
  const salesOrderId = firstBe.sales_order_id;

  let customerId: string | null = null;
  if (salesOrderId) {
    const { data: so, error: soError } = await db()
      .from('sales_orders')
      .select('engagement_id')
      .eq('tenant_id', ctx.tenantId)
      .eq('id', salesOrderId)
      .single();

    if (soError) {
      throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch sales order: ${soError.message}`);
    }

    if (so && so.engagement_id) {
      const { data: wo, error: woError } = await db()
        .from('commercial_work_orders')
        .select('customer_id')
        .eq('tenant_id', ctx.tenantId)
        .eq('id', so.engagement_id)
        .single();

      if (woError) {
        throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch commercial work order: ${woError.message}`);
      }

      if (wo && wo.customer_id) {
        customerId = wo.customer_id as string;
      }
    }
  }

  // 3. Compute aggregated amounts from committed billable events
  //    ABSOLUTE RULE: No recalculation. Sum committed values only.
  const totalAmount = billableEvents.reduce((sum, be) => sum + Number(be.total_amount), 0);
  const currency = billableEvents[0].currency;

  // 4. Execute atomic invoice generation via generate_invoice() RPC
  //    This RPC wraps all mutations (invoice + lines + status transition) in a
  //    single PostgreSQL transaction with explicit rollback on failure.
  //    This eliminates the application-level partial-state risk.
  //
  //    GAP-2: idempotencyKey is passed through to the RPC, which stores it on
  //    fin_invoices.idempotency_key. The UNIQUE(tenant_id, idempotency_key)
  //    constraint remains the final authority for duplicate prevention.
  const { data: rpcResult, error: rpcError } = await db()
    .rpc('generate_invoice', {
      p_tenant_id: ctx.tenantId,
      p_sales_order_id: salesOrderId ?? null,
      p_billable_event_ids: input.billableEventIds,
      p_side: input.side,
      p_currency: currency,
      p_subtotal: totalAmount,
      p_tax_percentage: input.taxPercentage ?? 0,
      p_total_amount: totalAmount,
      p_due_date: input.dueDate ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
    });

  if (rpcError) {
    // GAP-3: Distinguish idempotency conflict (23505) from other errors.
    // The database constraint is the final authority.
    if (rpcError.code === '23505') {
      throw new FinancialError('DUPLICATE_IDEMPOTENCY', 409,
        `Invoice with idempotency key '${input.idempotencyKey}' already exists for tenant ${ctx.tenantId}`);
    }
    throw new FinancialError('DATABASE_ERROR', 400, `Invoice generation failed: ${rpcError.message}`);
  }

  if (!rpcResult || !(rpcResult as any).success) {
    throw new FinancialError('DATABASE_ERROR', 400,
      `Invoice generation failed: ${(rpcResult as any)?.message || 'Unknown error'}`);
  }

  const invoiceId = (rpcResult as any).invoice_id;

  // 5. Fetch the committed invoice and lines to return typed objects
  //    These SELECTs are outside the transaction but read committed state.
  const { data: invoice, error: invError } = await db()
    .from('fin_invoices')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', invoiceId)
    .single();

  if (invError) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch created invoice: ${invError.message}`);
  }

  const { data: linesData, error: linesError } = await db()
    .from('fin_invoice_lines')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (linesError) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch invoice lines: ${linesError.message}`);
  }

  // 6. Map database rows to typed FinInvoiceLine objects
  const lines: FinInvoiceLine[] = (linesData ?? []).map((l: any) => ({
    id: l.id,
    tenantId: l.tenant_id,
    invoiceId: l.invoice_id,
    billableEventId: l.billable_event_id,
    soLineItemId: l.so_line_item_id,
    description: l.description,
    quantity: l.quantity,
    unitOfMeasure: l.unit_of_measure,
    unitAmount: l.unit_amount,
    amount: l.amount,
    sortOrder: l.sort_order,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    createdBy: l.created_by,
    updatedBy: l.updated_by,
  } as FinInvoiceLine));

  return { invoice: invoice as unknown as FinInvoice, lines, billableEventIds: input.billableEventIds };
}

export async function getInvoiceById(
  ctx: IdentityContext,
  invoiceId: string,
): Promise<FinInvoice | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_invoices')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', invoiceId)
    .maybeSingle();

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch invoice: ${error.message}`);
  }

  return data as unknown as FinInvoice | null;
}

// ============================================================================
// AR/AP REPOSITORY
// ============================================================================

export async function createArAp(
  ctx: IdentityContext,
  invoiceId: string,
  side: 'AR' | 'AP',
  totalAmount: number,
  currency: string,
  dueDate?: string | null,
): Promise<FinArAp> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('fin_ar_ap')
    .insert({
      tenant_id: ctx.tenantId,
      invoice_id: invoiceId,
      side,
      status: 'PENDING',
      currency,
      total_amount: totalAmount,
      paid_amount: 0,
      balance_amount: totalAmount,
      due_date: dueDate ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to create AR/AP: ${error.message}`);
  }

  return data as unknown as FinArAp;
}

export async function getArApById(
  ctx: IdentityContext,
  arApId: string,
): Promise<FinArAp | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_ar_ap')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', arApId)
    .maybeSingle();

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to fetch AR/AP: ${error.message}`);
  }

  return data as unknown as FinArAp | null;
}

// ============================================================================
// ADJUSTMENT REPOSITORY
// ============================================================================

export async function createAdjustment(
  ctx: IdentityContext,
  input: CreateAdjustmentInput,
): Promise<FinAdjustment> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('fin_adjustments')
    .insert({
      tenant_id: ctx.tenantId,
      invoice_id: input.invoiceId ?? null,
      ar_ap_id: input.arApId ?? null,
      adjustment_type: input.adjustmentType,
      amount: input.amount,
      currency: input.currency,
      reason: input.reason,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to create adjustment: ${error.message}`);
  }

  return data as unknown as FinAdjustment;
}

// ============================================================================
// IMMUTABILITY ENFORCEMENT
// ============================================================================

export function assertFinancialMutability(currentStatus: string): void {
  const immutableStatuses = ['PAID', 'INVOICED', 'POSTED', 'RECONCILED'];
  if (immutableStatuses.includes(currentStatus)) {
    throw new FinancialError(
      'INVALID_TRANSITION',
      409,
      `Cannot mutate financial record in ${currentStatus} status. Use adjustment/reversal instead.`,
    );
  }
}