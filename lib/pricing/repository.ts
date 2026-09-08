/**
 * Sentralogis — Phase 5C-1
 * lib/pricing/repository.ts
 *
 * Canonical Pricing repository (ADR-057 through ADR-064).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01),
 *   never from client input.
 * - Authorization via assertPermission (U-02) — commercial:manage for mutations.
 * - Rate identity is DB-generated UUID; client code MUST NOT generate canonical IDs.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import type {
  PricingRate,
  PricingRateVersion,
  PricingRateItem,
  CreatePricingRateInput,
  CreatePricingRateVersionInput,
  CreatePricingRateItemInput,
} from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type PricingDbClient = ReturnType<typeof supabaseAdmin.from>;
let _client: PricingDbClient | null = null;

export function _setPricingDbClient(client: PricingDbClient | null): void {
  _client = client;
}

function db(): PricingDbClient {
  return _client ?? (supabaseAdmin as unknown as PricingDbClient);
}

// ============================================================================
// PRICING RATE REPOSITORY
// ============================================================================

export async function createPricingRate(
  ctx: IdentityContext,
  input: CreatePricingRateInput,
): Promise<PricingRate> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await db()
    .from('pricing_rates')
    .insert({
      tenant_id: ctx.tenantId,
      rate_code: input.rateCode,
      capability_type: input.capabilityType,
      rate_description: input.rateDescription ?? null,
      status: 'DRAFT',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Rate code "${input.rateCode}" already exists for this tenant.`);
    }
    throw new Error(`Failed to create pricing rate: ${error.message}`);
  }

  return data as unknown as PricingRate;
}

export async function getPricingRateByCode(
  ctx: IdentityContext,
  rateCode: string,
): Promise<PricingRate | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('pricing_rates')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('rate_code', rateCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch pricing rate: ${error.message}`);
  }

  return data as unknown as PricingRate | null;
}

export async function listPricingRates(
  ctx: IdentityContext,
  capabilityType?: string,
): Promise<PricingRate[]> {
  assertPermission(ctx, 'commercial:read');

  let query = db()
    .from('pricing_rates')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (capabilityType) {
    query = query.eq('capability_type', capabilityType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list pricing rates: ${error.message}`);
  }

  return (data ?? []) as unknown as PricingRate[];
}

// ============================================================================
// PRICING RATE VERSION REPOSITORY
// ============================================================================

export async function createPricingRateVersion(
  ctx: IdentityContext,
  input: CreatePricingRateVersionInput,
): Promise<PricingRateVersion> {
  assertPermission(ctx, 'commercial:manage');

  const { data: rate } = await db()
    .from('pricing_rates')
    .select('id, tenant_id')
    .eq('id', input.rateId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!rate) {
    throw new Error('Rate not found or access denied.');
  }

  const { data: nextVersionRow } = await db().rpc('next_pricing_rate_version', {
    p_rate_id: input.rateId,
    p_tenant_id: ctx.tenantId,
  });

  const nextVersion = nextVersionRow as unknown as number;

  const { data, error } = await db()
    .from('pricing_rate_versions')
    .insert({
      rate_id: input.rateId,
      tenant_id: ctx.tenantId,
      version_no: nextVersion,
      effective_from: input.effectiveFrom ?? new Date().toISOString().split('T')[0],
      effective_to: input.effectiveTo ?? null,
      status: 'DRAFT',
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create rate version: ${error.message}`);
  }

  return data as unknown as PricingRateVersion;
}

export async function listPricingRateVersions(
  ctx: IdentityContext,
  rateId: string,
): Promise<PricingRateVersion[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('pricing_rate_versions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('rate_id', rateId)
    .order('version_no', { ascending: true });

  if (error) {
    throw new Error(`Failed to list rate versions: ${error.message}`);
  }

  return (data ?? []) as unknown as PricingRateVersion[];
}

// ============================================================================
// PRICING RATE ITEM REPOSITORY
// ============================================================================

export async function createPricingRateItem(
  ctx: IdentityContext,
  input: CreatePricingRateItemInput,
): Promise<PricingRateItem> {
  assertPermission(ctx, 'commercial:manage');

  const { data: version } = await db()
    .from('pricing_rate_versions')
    .select('id')
    .eq('id', input.rateVersionId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!version) {
    throw new Error('Rate version not found or access denied.');
  }

  const { data, error } = await db()
    .from('pricing_rate_items')
    .insert({
      rate_version_id: input.rateVersionId,
      tenant_id: ctx.tenantId,
      side: input.side,
      charge_basis: input.chargeBasis,
      unit_of_measure: input.unitOfMeasure,
      currency: input.currency,
      unit_rate: input.unitRate,
      min_charge: input.minCharge ?? null,
      max_charge: input.maxCharge ?? null,
      applicability_conditions: input.applicabilityConditions ?? {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create rate item: ${error.message}`);
  }

  return data as unknown as PricingRateItem;
}

export async function listPricingRateItems(
  ctx: IdentityContext,
  rateVersionId: string,
): Promise<PricingRateItem[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await db()
    .from('pricing_rate_items')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('rate_version_id', rateVersionId)
    .order('side', { ascending: true });

  if (error) {
    throw new Error(`Failed to list rate items: ${error.message}`);
  }

  return (data ?? []) as unknown as PricingRateItem[];
}
