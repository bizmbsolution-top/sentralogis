/**
 * Sentralogis — Phase 5D-3
 * lib/financial/payment-repository.ts
 *
 * Canonical Payment repository (ADR-067/068/069/070).
 *
 * - Number Authority: Server-side atomic sequence via next_payment_number() (Option 1A).
 *   Math.random() is strictly outlawed.
 * - Domain Orchestration: Canonical PaymentService/repository atomically manages
 *   payment allocation and invoice balance/status transitions (Option 2A).
 * - Safety Validation: Mandatory payment/invoice tenant matching, allocation bounds,
 *   duplicate prevention, and invoice state validation.
 * - Governance: Strict fail-closed feature flag (FIN_PAYMENT_ENABLED / FIN_PAYMENT_TEST_TENANTS) (Option 3A).
 * - Tenant is resolved EXCLUSIVELY from trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission, assertAnyPermission } from '../application/identity';
import { assertPaymentMutationEnabled } from './feature-flags';
import type {
  FinPayment,
  FinAllocation,
  FinSettlement,
  FinReconciliation,
  CreatePaymentInput,
  CreateAllocationInput,
  CreateSettlementInput,
  CreateReconciliationInput,
} from './payment-types';
import { PaymentError } from './payment-types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface PaymentDbClient {
  from(table: string): {
    select(cols?: string): PaymentQueryChain;
    insert(row: DbRow | DbRow[]): PaymentInsertChain;
    update(row: DbRow): PaymentUpdateChain;
    delete(): PaymentDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface PaymentQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): PaymentQueryChain;
  in(col: string, vals: unknown[]): PaymentQueryChain;
  order(col: string, opts: { ascending: boolean }): PaymentQueryChain;
  limit(count: number): PaymentQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface PaymentInsertChain {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface PaymentUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): PaymentUpdateChain;
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface PaymentDeleteChain {
  eq(col: string, val: unknown): PaymentDeleteChain;
  select(): Promise<DbListResult>;
}

let _client: PaymentDbClient = supabaseAdmin as unknown as PaymentDbClient;

/**
 * Override the database client for testing.
 * Call with `null` to restore the production client.
 * Internal testability seam only — not exposed through HTTP/API.
 */
export function _setPaymentDbClient(client: PaymentDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as PaymentDbClient);
}

function db(): PaymentDbClient {
  return _client;
}

// ============================================================================
// ROW MAPPERS (snake_case -> camelCase)
// ============================================================================

function mapRowToPayment(row: DbRow): FinPayment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    paymentNumber: row.payment_number as string,
    direction: row.direction as any,
    amount: Number(row.amount),
    currency: row.currency as string,
    paymentDate: row.payment_date as string,
    valueDate: (row.value_date as string) ?? null,
    reference: (row.reference as string) ?? null,
    method: (row.method as string) ?? null,
    status: row.status as any,
    fxRate: row.fx_rate != null ? Number(row.fx_rate) : null,
    fxCurrency: (row.fx_currency as string) ?? null,
    fxTimestamp: (row.fx_timestamp as string) ?? null,
    externalReference: (row.external_reference as string) ?? null,
    sourceMetadata: (row.source_metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

function mapRowToAllocation(row: DbRow): FinAllocation {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    paymentId: row.payment_id as string,
    invoiceId: row.invoice_id as string,
    amount: Number(row.amount),
    currency: row.currency as string,
    status: row.status as any,
    allocatedAt: row.allocated_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

function mapRowToSettlement(row: DbRow): FinSettlement {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    allocationId: row.allocation_id as string,
    status: row.status as any,
    settledAt: (row.settled_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
  };
}

// ============================================================================
// PAYMENT NUMBER AUTHORITY (Option 1A)
// ============================================================================

export async function getNextPaymentNumber(ctx: IdentityContext): Promise<string> {
  const { data, error } = await db().rpc('next_payment_number', { p_tenant_id: ctx.tenantId });
  if (error || !data) {
    throw new PaymentError('DATABASE_ERROR', 500, `Failed to allocate payment number: ${error?.message || 'unknown'}`);
  }
  return data as string;
}

// ============================================================================
// PAYMENT REPOSITORY
// ============================================================================

export async function createPayment(
  ctx: IdentityContext,
  input: CreatePaymentInput,
): Promise<FinPayment> {
  assertPaymentMutationEnabled(ctx);
  assertPermission(ctx, 'commercial:manage');

  if (input.amount <= 0) {
    throw new PaymentError('INVALID_AMOUNT', 400, 'Payment amount must be greater than zero.');
  }

  const paymentNumber = await getNextPaymentNumber(ctx);

  const { data, error } = await db()
    .from('fin_payments')
    .insert({
      tenant_id: ctx.tenantId,
      payment_number: paymentNumber,
      direction: input.direction,
      amount: input.amount,
      currency: input.currency,
      payment_date: input.paymentDate ?? new Date().toISOString().split('T')[0],
      value_date: input.valueDate ?? null,
      reference: input.reference ?? null,
      method: input.method ?? null,
      status: 'PENDING',
      external_reference: input.externalReference ?? null,
      source_metadata: input.sourceMetadata ?? {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      throw new PaymentError('DUPLICATE_IDEMPOTENCY', 409, 'Payment with this number already exists.');
    }
    throw new PaymentError(
      'DATABASE_ERROR',
      400,
      `Failed to create payment: ${error?.message ?? 'No data returned'}`,
    );
  }

  return mapRowToPayment(data);
}

export async function getPaymentById(
  ctx: IdentityContext,
  paymentId: string,
): Promise<FinPayment | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_payments')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to fetch payment: ${error.message}`);
  }

  return data ? mapRowToPayment(data) : null;
}

export async function updatePaymentStatus(
  ctx: IdentityContext,
  paymentId: string,
  status: string,
): Promise<FinPayment> {
  assertPaymentMutationEnabled(ctx);
  assertPermission(ctx, 'commercial:manage');

  const current = await getPaymentById(ctx, paymentId);
  if (!current) {
    throw new PaymentError('PAYMENT_NOT_FOUND', 404, `Payment ${paymentId} not found.`);
  }

  const { data, error } = await db()
    .from('fin_payments')
    .update({
      status,
      updated_by: ctx.userId,
    })
    .eq('id', paymentId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error || !data) {
    throw new PaymentError(
      'DATABASE_ERROR',
      400,
      `Failed to update payment status: ${error?.message ?? 'No data returned'}`,
    );
  }

  return mapRowToPayment(data);
}

// ============================================================================
// ============================================================================
// ALLOCATION REPOSITORY & DOMAIN ORCHESTRATION (D-3.B, D-3.1, D-7.A)
// ============================================================================

export async function createAllocation(
  ctx: IdentityContext,
  input: CreateAllocationInput,
): Promise<FinAllocation> {
  assertPaymentMutationEnabled(ctx);
  // D-7.A: Dual permission authorization gate
  assertAnyPermission(ctx, 'finance:manage', 'commercial:manage');

  if (input.amount <= 0) {
    throw new PaymentError('INVALID_AMOUNT', 400, 'Allocation amount must be greater than zero.');
  }

  // A. PAYMENT OWNERSHIP & STATE CHECK
  const { data: paymentRow, error: paymentFetchError } = await db()
    .from('fin_payments')
    .select('*')
    .eq('id', input.paymentId)
    .maybeSingle();

  if (paymentFetchError || !paymentRow) {
    throw new PaymentError('PAYMENT_NOT_FOUND', 404, `Payment ${input.paymentId} not found.`);
  }

  if (paymentRow.tenant_id !== ctx.tenantId) {
    throw new PaymentError('CROSS_TENANT_FORBIDDEN', 403, 'Payment does not belong to the active tenant.');
  }

  // Positive state set check: CONFIRMED or COMPLETED
  const paymentStatus = paymentRow.status as string;
  if (!['CONFIRMED', 'COMPLETED'].includes(paymentStatus)) {
    throw new PaymentError(
      'INVALID_STATE',
      400,
      `Cannot allocate payment in status ${paymentStatus}. Expected CONFIRMED or COMPLETED.`,
    );
  }

  // B. INVOICE OWNERSHIP & STATE CHECK
  const { data: invoiceRow, error: invoiceFetchError } = await db()
    .from('fin_invoices')
    .select('*')
    .eq('id', input.invoiceId)
    .maybeSingle();

  if (invoiceFetchError || !invoiceRow) {
    throw new PaymentError('INVOICE_NOT_FOUND', 404, `Invoice ${input.invoiceId} not found.`);
  }

  if (invoiceRow.tenant_id !== ctx.tenantId) {
    throw new PaymentError('CROSS_TENANT_FORBIDDEN', 403, 'Invoice does not belong to the active tenant.');
  }

  // Positive state set check: ISSUED or PARTIAL_PAID (D-1, H-1)
  const invoiceStatus = invoiceRow.status as string;
  if (!['ISSUED', 'PARTIAL_PAID'].includes(invoiceStatus)) {
    throw new PaymentError(
      'INVALID_STATE',
      400,
      `Cannot allocate payment to invoice in status ${invoiceStatus}. Expected ISSUED or PARTIAL_PAID.`,
    );
  }

  // Currency equality check
  if (paymentRow.currency !== input.currency || invoiceRow.currency !== input.currency) {
    throw new PaymentError(
      'CURRENCY_MISMATCH',
      400,
      `Currency mismatch: payment=${paymentRow.currency}, invoice=${invoiceRow.currency}, requested=${input.currency}`,
    );
  }

  const invoiceTotal = Number(invoiceRow.total_amount) || 0;
  const currentInvoicePaid = Number(invoiceRow.paid_amount) || 0;

  if (invoiceStatus === 'PAID' && currentInvoicePaid >= invoiceTotal) {
    throw new PaymentError('INVALID_STATE', 400, 'Invoice is already fully paid.');
  }

  // C. PAYMENT ALLOCATION LIMIT CHECK (Authoritative positive states: ALLOCATED or SETTLED)
  const { data: payAllocations, error: payAllocError } = await db()
    .from('fin_payment_allocations')
    .select('amount, status')
    .eq('payment_id', input.paymentId)
    .eq('tenant_id', ctx.tenantId);

  if (payAllocError) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to fetch existing payment allocations: ${payAllocError.message}`);
  }

  const existingPaymentAllocTotal = (payAllocations || [])
    .filter((a) => ['ALLOCATED', 'SETTLED'].includes(a.status as string))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const paymentTotal = Number(paymentRow.amount) || 0;
  if (existingPaymentAllocTotal + input.amount > paymentTotal) {
    throw new PaymentError(
      'ALLOCATION_EXCEEDS_PAYMENT',
      400,
      `Allocation amount ${input.amount} exceeds available payment unapplied balance ${paymentTotal - existingPaymentAllocTotal}.`,
    );
  }

  // D. INVOICE OUTSTANDING LIMIT CHECK (Authoritative positive states: ALLOCATED or SETTLED)
  const { data: invAllocations, error: invAllocError } = await db()
    .from('fin_payment_allocations')
    .select('amount, status')
    .eq('invoice_id', input.invoiceId)
    .eq('tenant_id', ctx.tenantId);

  if (invAllocError) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to fetch existing invoice allocations: ${invAllocError.message}`);
  }

  const existingInvoiceAllocTotal = (invAllocations || [])
    .filter((a) => ['ALLOCATED', 'SETTLED'].includes(a.status as string))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const invoiceOutstanding = invoiceTotal - existingInvoiceAllocTotal;
  if (input.amount > invoiceOutstanding) {
    throw new PaymentError(
      'ALLOCATION_EXCEEDS_INVOICE',
      400,
      `Allocation amount ${input.amount} exceeds outstanding invoice receivable balance ${invoiceOutstanding}.`,
    );
  }

  // E. DEDICATED TRANSACTIONAL ALLOCATION RPC (D-3.B, D-3.1)
  const client = db();
  if (typeof client.rpc === 'function') {
    const { data: rpcData, error: rpcError } = await client.rpc('create_payment_allocation', {
      p_tenant_id: ctx.tenantId,
      p_payment_id: input.paymentId,
      p_invoice_id: input.invoiceId,
      p_amount: input.amount,
      p_currency: input.currency,
      p_user_id: ctx.userId,
      p_idempotency_key: null,
    });

    if (rpcError) {
      const msg = rpcError.message || '';
      if (rpcError.code === '23505' || msg.includes('DUPLICATE_IDEMPOTENCY')) {
        throw new PaymentError('DUPLICATE_IDEMPOTENCY', 409, 'Allocation already exists for this payment-invoice pair.');
      }
      if (msg.includes('ALLOCATION_REVERSED') || msg.includes('INVALID_STATE')) {
        throw new PaymentError('INVALID_STATE', 400, msg);
      }
      if (msg.includes('CURRENCY_MISMATCH')) {
        throw new PaymentError('CURRENCY_MISMATCH', 400, msg);
      }
      if (msg.includes('CROSS_TENANT') || msg.includes('FORBIDDEN')) {
        throw new PaymentError('CROSS_TENANT_FORBIDDEN', 403, msg);
      }
      throw new PaymentError('DATABASE_ERROR', 400, `Allocation failed in database RPC: ${msg}`);
    }

    if (rpcData) {
      const res = rpcData as Record<string, unknown>;
      return mapRowToAllocation({
        id: res.id,
        tenant_id: res.tenant_id ?? ctx.tenantId,
        payment_id: res.payment_id ?? input.paymentId,
        invoice_id: res.invoice_id ?? input.invoiceId,
        amount: res.amount ?? input.amount,
        currency: res.currency ?? input.currency,
        status: res.status ?? 'ALLOCATED',
        created_at: res.created_at ?? new Date().toISOString(),
        updated_at: res.updated_at ?? new Date().toISOString(),
        created_by: res.created_by ?? ctx.userId,
        updated_by: res.updated_by ?? ctx.userId,
      });
    }
  }

  // Runtime assertion: RPC execution is strictly mandatory in production
  if (process.env.NODE_ENV !== 'test') {
    throw new PaymentError(
      'DATABASE_ERROR',
      500,
      'Transactional payment allocation RPC is mandatory in production runtime. Direct writes are prohibited.',
    );
  }

  // Testability fallback ONLY for explicit test runners where mock db does not implement RPC
  // 1. In-memory duplicate & idempotency check (D-3.1, Case B/C/D)
  const { data: existingAllocs } = await client
    .from('fin_payment_allocations')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('payment_id', input.paymentId);

  const existingMatch = (existingAllocs || []).find((a) => a.invoice_id === input.invoiceId);
  if (existingMatch) {
    if (['ALLOCATED', 'SETTLED'].includes(existingMatch.status as string)) {
      if (Number(existingMatch.amount) === input.amount) {
        // Case B: Deterministic idempotent success
        return mapRowToAllocation(existingMatch);
      }
      // Case C: Deterministic rejection on different amount
      throw new PaymentError('DUPLICATE_IDEMPOTENCY', 409, 'Allocation already exists for this payment-invoice pair.');
    }
    if (existingMatch.status === 'REVERSED') {
      // Case D: Deterministic rejection on reversed allocation
      throw new PaymentError('INVALID_STATE', 400, 'Allocation for this payment and invoice was previously reversed and cannot be reallocated');
    }
  }

  const { data: allocData, error: allocError } = await client
    .from('fin_payment_allocations')
    .insert({
      tenant_id: ctx.tenantId,
      payment_id: input.paymentId,
      invoice_id: input.invoiceId,
      amount: input.amount,
      currency: input.currency,
      status: 'ALLOCATED',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (allocError || !allocData) {
    if (allocError?.code === '23505') {
      throw new PaymentError('DUPLICATE_IDEMPOTENCY', 409, 'Allocation already exists for this payment-invoice pair.');
    }
    throw new PaymentError(
      'DATABASE_ERROR',
      400,
      `Failed to create allocation: ${allocError?.message ?? 'No data returned'}`,
    );
  }

  const newInvoicePaid = existingInvoiceAllocTotal + input.amount;
  const isFullyPaid = newInvoicePaid >= invoiceTotal;
  const newInvoiceStatus = isFullyPaid ? 'PAID' : (newInvoicePaid > 0 ? 'PARTIAL_PAID' : invoiceStatus);
  const paidAt = isFullyPaid ? new Date().toISOString() : null;

  await client
    .from('fin_invoices')
    .update({
      paid_amount: newInvoicePaid,
      status: newInvoiceStatus,
      paid_at: paidAt,
      updated_by: ctx.userId,
    })
    .eq('id', input.invoiceId)
    .eq('tenant_id', ctx.tenantId);

  const { data: arApRow } = await client
    .from('fin_ar_ap')
    .select('id, total_amount')
    .eq('invoice_id', input.invoiceId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (arApRow) {
    const arApTotal = Number(arApRow.total_amount) || 0;
    const arApBalance = Math.max(0, arApTotal - newInvoicePaid);
    const arApStatus = newInvoicePaid >= arApTotal ? 'PAID' : (newInvoicePaid > 0 ? 'PARTIAL_PAID' : 'INVOICED');
    await client
      .from('fin_ar_ap')
      .update({
        paid_amount: newInvoicePaid,
        balance_amount: arApBalance,
        status: arApStatus,
        updated_by: ctx.userId,
      })
      .eq('id', arApRow.id)
      .eq('tenant_id', ctx.tenantId);
  }

  if (existingPaymentAllocTotal + input.amount >= paymentTotal) {
    await client
      .from('fin_payments')
      .update({
        status: 'ALLOCATED',
        updated_by: ctx.userId,
      })
      .eq('id', input.paymentId)
      .eq('tenant_id', ctx.tenantId);
  }

  return mapRowToAllocation(allocData);
}

export async function listAllocationsByPayment(
  ctx: IdentityContext,
  paymentId: string,
): Promise<FinAllocation[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('fin_payment_allocations')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('payment_id', paymentId)
    .order('allocated_at', { ascending: true });

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to list allocations: ${error.message}`);
  }

  return (data ?? []).map(mapRowToAllocation);
}

// ============================================================================
// SETTLEMENT REPOSITORY
// ============================================================================

export interface SettlementWithOutboxResult {
  settlement: FinSettlement;
  accountingEventId?: string;
}

export async function createSettlementWithOutbox(
  ctx: IdentityContext,
  input: CreateSettlementInput,
): Promise<SettlementWithOutboxResult> {
  assertPaymentMutationEnabled(ctx);
  assertPermission(ctx, 'commercial:manage');

  const client = db();

  // If client supports RPC (e.g. SupabaseClient / supabaseAdmin), execute the atomic transaction
  if (typeof client.rpc === 'function') {
    const validUserId = (ctx.userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ctx.userId)) ? ctx.userId : null;
    const { data, error } = await client.rpc('fn_settle_allocation_with_outbox', {
      p_tenant_id: ctx.tenantId,
      p_allocation_id: input.allocationId,
      p_user_id: validUserId,
      p_idempotency_key: null,
    });

    if (error) {
      const msg = error.message || '';
      if (!msg.includes('Unknown RPC')) {
        if (msg.includes('ALREADY_SETTLED') || error.code === '23505' || msg.includes('DUPLICATE_SETTLEMENT')) {
          throw new PaymentError('INVALID_STATE', 400, 'Allocation is already settled.');
        }
        if (msg.includes('ALLOCATION_NOT_FOUND')) {
          throw new PaymentError('DATABASE_ERROR', 404, `Allocation ${input.allocationId} not found.`);
        }
        throw new PaymentError('DATABASE_ERROR', 400, `Failed to create settlement: ${msg}`);
      }
      // Fall through to mock sequential fallback below for test clients lacking fn_settle_allocation_with_outbox
    } else {
      const payload = data as {
        settlement_id: string;
        allocation_id: string;
        status: string;
        settled_at: string;
        accounting_event_id: string;
        amount: number;
        currency: string;
        is_duplicate: boolean;
      };

      const { data: settlementRow, error: fetchErr } = await client
        .from('fin_settlements')
        .select('*')
        .eq('id', payload.settlement_id)
        .eq('tenant_id', ctx.tenantId)
        .single();

      if (fetchErr || !settlementRow) {
        throw new PaymentError('DATABASE_ERROR', 400, `Settlement created but failed to fetch: ${fetchErr?.message}`);
      }

      return {
        settlement: mapRowToSettlement(settlementRow),
        accountingEventId: payload.accounting_event_id,
      };
    }
  }

  // Fallback for simple unit test mock DB clients without .rpc() support
  // Verify allocation exists, belongs to tenant, and is not already settled
  const { data: allocationRow, error: allocFetchError } = await client
    .from('fin_payment_allocations')
    .select('*')
    .eq('id', input.allocationId)
    .maybeSingle();

  if (allocFetchError || !allocationRow) {
    throw new PaymentError('DATABASE_ERROR', 404, `Allocation ${input.allocationId} not found.`);
  }

  if (allocationRow.tenant_id !== ctx.tenantId) {
    throw new PaymentError('CROSS_TENANT_FORBIDDEN', 403, 'Allocation does not belong to active tenant.');
  }

  if (allocationRow.status === 'SETTLED') {
    throw new PaymentError('INVALID_STATE', 400, 'Allocation is already settled.');
  }

  const settledAt = new Date().toISOString();

  // Create settlement record
  const { data: settlementData, error: settlementError } = await client
    .from('fin_settlements')
    .insert({
      tenant_id: ctx.tenantId,
      allocation_id: input.allocationId,
      status: 'SETTLED',
      settled_at: settledAt,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (settlementError) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to create settlement: ${settlementError.message}`);
  }

  // Update allocation status to SETTLED
  await client
    .from('fin_payment_allocations')
    .update({
      status: 'SETTLED',
      updated_by: ctx.userId,
    })
    .eq('id', input.allocationId)
    .eq('tenant_id', ctx.tenantId);

  // Check if all allocations for the payment are settled; if so, transition payment to COMPLETED
  const paymentId = allocationRow.payment_id as string;
  const { data: paymentAllocations } = await client
    .from('fin_payment_allocations')
    .select('amount, status')
    .eq('payment_id', paymentId)
    .eq('tenant_id', ctx.tenantId);

  const paymentRecord = await getPaymentById(ctx, paymentId);
  if (paymentRecord && paymentAllocations && paymentAllocations.length > 0) {
    const allSettled = paymentAllocations.every((a) => a.status === 'SETTLED');
    const totalAllocated = paymentAllocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    if (allSettled && totalAllocated >= Number(paymentRecord.amount)) {
      await updatePaymentStatus(ctx, paymentId, 'COMPLETED');
    }
  }

  return {
    settlement: mapRowToSettlement(settlementData!),
  };
}

export async function createSettlement(
  ctx: IdentityContext,
  input: CreateSettlementInput,
): Promise<FinSettlement> {
  const res = await createSettlementWithOutbox(ctx, input);
  return res.settlement;
}

// ============================================================================
// RECONCILIATION REPOSITORY
// ============================================================================

export async function createReconciliation(
  ctx: IdentityContext,
  input: CreateReconciliationInput,
): Promise<FinReconciliation> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('fin_reconciliation_records')
    .insert({
      tenant_id: ctx.tenantId,
      payment_id: input.paymentId ?? null,
      external_reference: input.externalReference ?? null,
      external_amount: input.externalAmount ?? null,
      external_currency: input.externalCurrency ?? null,
      external_date: input.externalDate ?? null,
      status: 'UNMATCHED',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to create reconciliation: ${error.message}`);
  }

  return data as unknown as FinReconciliation;
}

export async function matchReconciliation(
  ctx: IdentityContext,
  reconciliationId: string,
  paymentId: string,
): Promise<FinReconciliation> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('fin_reconciliation_records')
    .update({
      payment_id: paymentId,
      status: 'MATCHED',
      matched_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('id', reconciliationId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to match reconciliation: ${error.message}`);
  }

  return data as unknown as FinReconciliation;
}
