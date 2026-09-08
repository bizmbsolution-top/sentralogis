/**
 * Sentralogis — Phase 5C-1
 * lib/pricing/types.ts
 *
 * Canonical Pricing domain types (ADR-057 through ADR-064).
 *
 * Security invariant (mirrors U-01/U-13/U-15): the input DTO contains NO tenantId
 * and NO userId. Both come EXCLUSIVELY from the trusted IdentityContext at
 * call time — never from the client payload.
 *
 * Rate identity is DB-generated UUID; rate_code is the business identifier.
 * Client code MUST NOT generate canonical rate identifiers.
 */

// ============================================================================
// PRICING RATE STATUS (mirrors com_pricing_rate_status enum)
// ============================================================================

export type PricingRateStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'INACTIVE';

export const PRICING_RATE_ACTIVE_STATUSES: readonly PricingRateStatus[] = [
  'ACTIVE',
];

export const PRICING_RATE_TERMINAL_STATUSES: readonly PricingRateStatus[] = [
  'SUPERSEDED',
  'INACTIVE',
];

// ============================================================================
// PRICING SIDE (buy vs sell; ADR-060)
// ============================================================================

export type PricingSide =
  | 'SELL'
  | 'BUY';

// ============================================================================
// CAPABILITY TYPE (matches commercial_capability_registry.capability_code)
// ============================================================================

export type PricingCapabilityType =
  | 'FORWARDING'
  | 'CUSTOMS'
  | 'TRUCKING'
  | 'WAREHOUSE';

// ============================================================================
// PRICING RATE (rate master identity; ADR-058)
// ============================================================================

export interface PricingRate {
  id: string;
  tenantId: string;
  rateCode: string;
  capabilityType: PricingCapabilityType;
  rateDescription: string | null;
  status: PricingRateStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// PRICING RATE VERSION (versioned definition; ADR-058/059)
// ============================================================================

export interface PricingRateVersion {
  id: string;
  rateId: string;
  tenantId: string;
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: PricingRateStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// PRICING RATE ITEM (charge definition; ADR-058/060/062)
// ============================================================================

export interface PricingRateItem {
  id: string;
  rateVersionId: string;
  tenantId: string;
  side: PricingSide;
  chargeBasis: string;
  unitOfMeasure: string;
  currency: string;
  unitRate: number;
  minCharge: number | null;
  maxCharge: number | null;
  applicabilityConditions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — comes from IdentityContext)
// ============================================================================

export interface CreatePricingRateInput {
  rateCode: string;
  capabilityType: PricingCapabilityType;
  rateDescription?: string | null;
}

export interface CreatePricingRateVersionInput {
  rateId: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface CreatePricingRateItemInput {
  rateVersionId: string;
  side: PricingSide;
  chargeBasis: string;
  unitOfMeasure: string;
  currency: string;
  unitRate: number;
  minCharge?: number | null;
  maxCharge?: number | null;
  applicabilityConditions?: Record<string, unknown>;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CreatePricingRateResult {
  rate: PricingRate;
  version: PricingRateVersion;
}
