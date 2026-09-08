/**
 * Sentralogis — Phase 5C-4
 * lib/pricing/override-service.ts
 *
 * Canonical Price Override service (ADR-063).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Threshold-based approval governance.
 * - Append-only audit trail.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type {
  PricingOverride,
  PricingOverrideStatus,
  RequestOverrideInput,
  ApproveOverrideInput,
  RejectOverrideInput,
  ApplyOverrideInput,
  CancelOverrideInput,
  ThresholdResult,
  RequestOverrideResult,
} from './override-types';
import { PricingOverrideError } from './override-types';

// ============================================================================
// THRESHOLD GOVERNANCE (ADR-063)
// ============================================================================

const THRESHOLD_LOW = 5;
const THRESHOLD_HIGH = 20;

export function evaluateThreshold(
  originalPrice: number,
  overridePrice: number,
): ThresholdResult {
  const varianceAmount = overridePrice - originalPrice;
  const variancePercentage =
    originalPrice > 0 ? (Math.abs(varianceAmount) / originalPrice) * 100 : null;

  let threshold: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let approvalRequired = false;
  let autoApprove = true;

  if (variancePercentage !== null) {
    if (variancePercentage <= THRESHOLD_LOW) {
      threshold = 'LOW';
      approvalRequired = false;
      autoApprove = true;
    } else if (variancePercentage <= THRESHOLD_HIGH) {
      threshold = 'MEDIUM';
      approvalRequired = true;
      autoApprove = false;
    } else {
      threshold = 'HIGH';
      approvalRequired = true;
      autoApprove = false;
    }
  } else {
    threshold = 'HIGH';
    approvalRequired = true;
    autoApprove = false;
  }

  return {
    varianceAmount,
    variancePercentage,
    approvalRequired,
    autoApprove,
    threshold,
  };
}

// ============================================================================
// REQUEST OVERRIDE
// ============================================================================

export async function requestOverride(
  ctx: IdentityContext,
  input: RequestOverrideInput,
): Promise<RequestOverrideResult> {
  assertPermission(ctx, 'pricing:override');

  const threshold = evaluateThreshold(input.originalCalculatedPrice, input.overridePrice);

  let status: PricingOverrideStatus = 'REQUESTED';
  if (threshold.autoApprove) {
    status = 'APPROVED';
  }

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .insert({
      tenant_id: ctx.tenantId,
      sales_order_id: input.salesOrderId,
      so_line_item_id: input.soLineItemId ?? null,
      source_quote_item_id: input.sourceQuoteItemId ?? null,
      capability_type: input.capabilityType,
      side: input.side,
      original_calculated_price: input.originalCalculatedPrice,
      override_price: input.overridePrice,
      currency: input.currency,
      unit_of_measure: input.unitOfMeasure,
      variance_amount: threshold.varianceAmount,
      variance_percentage: threshold.variancePercentage,
      reason: input.reason,
      status,
      requester_id: ctx.userId,
      approver_id: threshold.autoApprove ? ctx.userId : null,
      approved_at: threshold.autoApprove ? new Date().toISOString() : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to request override: ${error.message}`);
  }

  return {
    override: data as unknown as PricingOverride,
    threshold,
    approvalRequired: threshold.approvalRequired,
  };
}

// ============================================================================
// APPROVE OVERRIDE
// ============================================================================

export async function approveOverride(
  ctx: IdentityContext,
  input: ApproveOverrideInput,
): Promise<PricingOverride> {
  assertPermission(ctx, 'pricing:approve');

  const existing = await getOverrideById(ctx, input.overrideId);
  if (!existing) {
    throw new PricingOverrideError('OVERRIDE_NOT_FOUND', 404, 'Override not found.');
  }

  if (existing.status !== 'REQUESTED') {
    throw new PricingOverrideError('INVALID_TRANSITION', 409, `Cannot approve override in ${existing.status} status.`);
  }

  if (existing.requesterId === ctx.userId) {
    throw new PricingOverrideError('SELF_APPROVAL', 403, 'Self-approval is not permitted.');
  }

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .update({
      status: 'APPROVED',
      approver_id: ctx.userId,
      approved_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('id', input.overrideId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to approve override: ${error.message}`);
  }

  return data as unknown as PricingOverride;
}

// ============================================================================
// REJECT OVERRIDE
// ============================================================================

export async function rejectOverride(
  ctx: IdentityContext,
  input: RejectOverrideInput,
): Promise<PricingOverride> {
  assertPermission(ctx, 'pricing:approve');

  const existing = await getOverrideById(ctx, input.overrideId);
  if (!existing) {
    throw new PricingOverrideError('OVERRIDE_NOT_FOUND', 404, 'Override not found.');
  }

  if (existing.status !== 'REQUESTED') {
    throw new PricingOverrideError('INVALID_TRANSITION', 409, `Cannot reject override in ${existing.status} status.`);
  }

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .update({
      status: 'REJECTED',
      approver_id: ctx.userId,
      approved_at: new Date().toISOString(),
      rejection_reason: input.rejectionReason,
      updated_by: ctx.userId,
    })
    .eq('id', input.overrideId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to reject override: ${error.message}`);
  }

  return data as unknown as PricingOverride;
}

// ============================================================================
// APPLY OVERRIDE
// ============================================================================

export async function applyOverride(
  ctx: IdentityContext,
  input: ApplyOverrideInput,
): Promise<PricingOverride> {
  assertPermission(ctx, 'pricing:override');

  const existing = await getOverrideById(ctx, input.overrideId);
  if (!existing) {
    throw new PricingOverrideError('OVERRIDE_NOT_FOUND', 404, 'Override not found.');
  }

  if (existing.status !== 'APPROVED') {
    throw new PricingOverrideError('INVALID_TRANSITION', 409, `Cannot apply override in ${existing.status} status.`);
  }

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .update({
      status: 'APPLIED',
      applied_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('id', input.overrideId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to apply override: ${error.message}`);
  }

  return data as unknown as PricingOverride;
}

// ============================================================================
// CANCEL OVERRIDE
// ============================================================================

export async function cancelOverride(
  ctx: IdentityContext,
  input: CancelOverrideInput,
): Promise<PricingOverride> {
  assertPermission(ctx, 'pricing:override');

  const existing = await getOverrideById(ctx, input.overrideId);
  if (!existing) {
    throw new PricingOverrideError('OVERRIDE_NOT_FOUND', 404, 'Override not found.');
  }

  if (existing.status === 'APPLIED' || existing.status === 'CANCELLED') {
    throw new PricingOverrideError('INVALID_TRANSITION', 409, `Cannot cancel override in ${existing.status} status.`);
  }

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .update({
      status: 'CANCELLED',
      updated_by: ctx.userId,
    })
    .eq('id', input.overrideId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to cancel override: ${error.message}`);
  }

  return data as unknown as PricingOverride;
}

// ============================================================================
// GET OVERRIDE
// ============================================================================

export async function getOverrideById(
  ctx: IdentityContext,
  overrideId: string,
): Promise<PricingOverride | null> {
  assertPermission(ctx, 'pricing:read');

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', overrideId)
    .maybeSingle();

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to fetch override: ${error.message}`);
  }

  return data as unknown as PricingOverride | null;
}

// ============================================================================
// LIST OVERRIDES BY SO
// ============================================================================

export async function listOverridesBySO(
  ctx: IdentityContext,
  salesOrderId: string,
): Promise<PricingOverride[]> {
  assertPermission(ctx, 'pricing:read');

  const { data, error } = await supabaseAdmin
    .from('pricing_price_overrides')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('sales_order_id', salesOrderId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PricingOverrideError('DATABASE_ERROR', 400, `Failed to list overrides: ${error.message}`);
  }

  return (data ?? []) as unknown as PricingOverride[];
}
