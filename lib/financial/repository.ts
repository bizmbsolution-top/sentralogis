/**
 * Sentralogis — Phase 5D-2
 * lib/financial/repository.ts
 *
 * Canonical Financial repository (ADR-064).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Financial records are append-only after commitment.
 * - Idempotent: duplicate requests return existing records.
 * - Immutable: committed records cannot be silently mutated.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
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
// BILLABLE EVENT REPOSITORY
// ============================================================================

export async function createBillableEvent(
  ctx: IdentityContext,
  input: CreateBillableEventInput,
): Promise<BillableEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
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
      const { data: existing } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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
): Promise<{ invoice: FinInvoice; lines: FinInvoiceLine[] }> {
  assertPermission(ctx, 'commercial:manage');

  const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('fin_invoices')
    .insert({
      tenant_id: ctx.tenantId,
      invoice_number: invoiceNumber,
      sales_order_id: input.salesOrderId ?? null,
      customer_id: input.customerId ?? null,
      side: input.side,
      status: 'DRAFT',
      invoice_date: input.invoiceDate ?? new Date().toISOString().split('T')[0],
      due_date: input.dueDate ?? null,
      currency: input.currency,
      tax_percentage: input.taxPercentage ?? 0,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (invoiceError) {
    throw new FinancialError('DATABASE_ERROR', 400, `Failed to create invoice: ${invoiceError.message}`);
  }

  const lines: FinInvoiceLine[] = [];

  return { invoice: invoice as unknown as FinInvoice, lines };
}

export async function getInvoiceById(
  ctx: IdentityContext,
  invoiceId: string,
): Promise<FinInvoice | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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

  const { data, error } = await supabaseAdmin
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
