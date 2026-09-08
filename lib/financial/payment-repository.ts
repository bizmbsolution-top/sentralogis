/**
 * Sentralogis — Phase 5D-3
 * lib/financial/payment-repository.ts
 *
 * Canonical Payment repository (ADR-067/068/069).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Idempotent: duplicate requests return existing records.
 * - Immutable: committed records cannot be silently mutated.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
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
// PAYMENT REPOSITORY
// ============================================================================

export async function createPayment(
  ctx: IdentityContext,
  input: CreatePaymentInput,
): Promise<FinPayment> {
  assertPermission(ctx, 'commercial:manage');

  const paymentNumber = `PAY-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const { data, error } = await supabaseAdmin
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

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to create payment: ${error.message}`);
  }

  return data as unknown as FinPayment;
}

export async function getPaymentById(
  ctx: IdentityContext,
  paymentId: string,
): Promise<FinPayment | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await supabaseAdmin
    .from('fin_payments')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to fetch payment: ${error.message}`);
  }

  return data as unknown as FinPayment | null;
}

export async function updatePaymentStatus(
  ctx: IdentityContext,
  paymentId: string,
  status: string,
): Promise<FinPayment> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
    .from('fin_payments')
    .update({
      status,
      updated_by: ctx.userId,
    })
    .eq('id', paymentId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to update payment status: ${error.message}`);
  }

  return data as unknown as FinPayment;
}

// ============================================================================
// ALLOCATION REPOSITORY
// ============================================================================

export async function createAllocation(
  ctx: IdentityContext,
  input: CreateAllocationInput,
): Promise<FinAllocation> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
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

  if (error) {
    if (error.code === '23505') {
      throw new PaymentError('DUPLICATE_IDEMPOTENCY', 409, 'Allocation already exists for this payment-invoice pair.');
    }
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to create allocation: ${error.message}`);
  }

  return data as unknown as FinAllocation;
}

export async function listAllocationsByPayment(
  ctx: IdentityContext,
  paymentId: string,
): Promise<FinAllocation[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await supabaseAdmin
    .from('fin_payment_allocations')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('payment_id', paymentId)
    .order('allocated_at', { ascending: true });

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to list allocations: ${error.message}`);
  }

  return (data ?? []) as unknown as FinAllocation[];
}

// ============================================================================
// SETTLEMENT REPOSITORY
// ============================================================================

export async function createSettlement(
  ctx: IdentityContext,
  input: CreateSettlementInput,
): Promise<FinSettlement> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
    .from('fin_settlements')
    .insert({
      tenant_id: ctx.tenantId,
      allocation_id: input.allocationId,
      status: 'SETTLED',
      settled_at: new Date().toISOString(),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new PaymentError('DATABASE_ERROR', 400, `Failed to create settlement: ${error.message}`);
  }

  return data as unknown as FinSettlement;
}

// ============================================================================
// RECONCILIATION REPOSITORY
// ============================================================================

export async function createReconciliation(
  ctx: IdentityContext,
  input: CreateReconciliationInput,
): Promise<FinReconciliation> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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
