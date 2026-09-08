/**
 * Sentralogis — Phase 5C-2
 * lib/pricing/selection.ts
 *
 * Canonical Rate Selection Engine (ADR-065).
 *
 * Deterministic rate selection with explicit precedence hierarchy.
 * Never uses arbitrary ordering or hidden tie-breakers.
 */

import type {
  PricingRate,
  PricingRateVersion,
  PricingRateItem,
  PricingCapabilityType,
  PricingSide,
} from './types';

// ============================================================================
// PRICING CONTEXT
// ============================================================================

export interface PricingContext {
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  effectiveDate: string;
  customerId?: string | null;
  origin?: string | null;
  destination?: string | null;
  serviceType?: string | null;
  containerType?: string | null;
  chargeBasis?: string | null;
  currency?: string | null;
}

// ============================================================================
// CANDIDATE
// ============================================================================

export interface RateCandidate {
  rate: PricingRate;
  version: PricingRateVersion;
  items: PricingRateItem[];
  priority: number;
  specificityScore: number;
}

// ============================================================================
// SELECTION RESULT
// ============================================================================

export interface RateSelectionResult {
  selected: RateCandidate | null;
  candidates: RateCandidate[];
  rejections: CandidateRejection[];
  ambiguous: boolean;
  ambiguityReason: string | null;
}

export interface CandidateRejection {
  rateId: string;
  rateCode: string;
  versionId: string;
  reason: string;
}

// ============================================================================
// ADR-065 PRECEDENCE HIERARCHY
// ============================================================================

interface PrecedenceLevel {
  priority: number;
  matches: (ctx: PricingContext, item: PricingRateItem) => boolean;
}

const PRECEDENCE_LEVELS: PrecedenceLevel[] = [
  {
    priority: 1,
    matches: (ctx, item) =>
      !!ctx.customerId && !!ctx.origin && !!ctx.destination && !!ctx.serviceType && !!ctx.containerType,
  },
  {
    priority: 2,
    matches: (ctx, item) =>
      !!ctx.customerId && !!ctx.origin && !!ctx.destination && !!ctx.containerType,
  },
  {
    priority: 3,
    matches: (ctx, item) =>
      !!ctx.customerId && !!ctx.containerType,
  },
  {
    priority: 4,
    matches: (ctx, item) =>
      !!ctx.customerId,
  },
  {
    priority: 5,
    matches: (ctx, item) =>
      !!ctx.origin && !!ctx.destination && !!ctx.containerType,
  },
  {
    priority: 6,
    matches: (ctx, item) =>
      !!ctx.origin && !!ctx.destination,
  },
  {
    priority: 7,
    matches: (_ctx, _item) => true,
  },
];

// ============================================================================
// ELIGIBILITY
// ============================================================================

function isEligible(
  version: PricingRateVersion,
  item: PricingRateItem,
  ctx: PricingContext,
): { eligible: boolean; reason: string } {
  if (version.status !== 'ACTIVE') {
    return { eligible: false, reason: `Version status is ${version.status}, not ACTIVE` };
  }

  if (item.side !== ctx.side) {
    return { eligible: false, reason: `Side mismatch: item=${item.side}, context=${ctx.side}` };
  }

  if (ctx.currency && item.currency !== ctx.currency) {
    return { eligible: false, reason: `Currency mismatch: item=${item.currency}, context=${ctx.currency}` };
  }

  const effectiveFrom = new Date(version.effectiveFrom);
  const effectiveTo = version.effectiveTo ? new Date(version.effectiveTo) : null;
  const pricingDate = new Date(ctx.effectiveDate);

  if (pricingDate < effectiveFrom) {
    return { eligible: false, reason: `Pricing date ${ctx.effectiveDate} is before effective_from ${version.effectiveFrom}` };
  }

  if (effectiveTo && pricingDate >= effectiveTo) {
    return { eligible: false, reason: `Pricing date ${ctx.effectiveDate} is >= effective_to ${version.effectiveTo}` };
  }

  return { eligible: true, reason: '' };
}

// ============================================================================
// SPECIFICITY SCORING
// ============================================================================

function computeSpecificityScore(ctx: PricingContext, item: PricingRateItem): number {
  let score = 0;
  const conditions = item.applicabilityConditions || {};

  if (ctx.customerId && conditions.customer_id === ctx.customerId) score += 100;
  if (ctx.origin && conditions.origin === ctx.origin) score += 50;
  if (ctx.destination && conditions.destination === ctx.destination) score += 50;
  if (ctx.containerType && conditions.container_type === ctx.containerType) score += 25;
  if (ctx.serviceType && conditions.service_type === ctx.serviceType) score += 25;
  if (ctx.chargeBasis && item.chargeBasis === ctx.chargeBasis) score += 10;

  return score;
}

// ============================================================================
// SELECTION ENGINE
// ============================================================================

export function selectRate(
  rates: PricingRate[],
  versions: PricingRateVersion[],
  items: PricingRateItem[],
  ctx: PricingContext,
): RateSelectionResult {
  const candidates: RateCandidate[] = [];
  const rejections: CandidateRejection[] = [];

  for (const rate of rates) {
    if (rate.capabilityType !== ctx.capabilityType) {
      continue;
    }

    for (const version of versions) {
      if (version.rateId !== rate.id) continue;

      const versionItems = items.filter((i) => i.rateVersionId === version.id);

      for (const item of versionItems) {
        const { eligible, reason } = isEligible(version, item, ctx);

        if (!eligible) {
          rejections.push({
            rateId: rate.id,
            rateCode: rate.rateCode,
            versionId: version.id,
            reason,
          });
          continue;
        }

        const priority = computePriority(ctx, item);
        const specificityScore = computeSpecificityScore(ctx, item);

        candidates.push({
          rate,
          version,
          items: [item],
          priority,
          specificityScore,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return {
      selected: null,
      candidates: [],
      rejections,
      ambiguous: false,
      ambiguityReason: null,
    };
  }

  const minPriority = Math.min(...candidates.map((c) => c.priority));
  const topCandidates = candidates.filter((c) => c.priority === minPriority);

  if (topCandidates.length === 1) {
    return {
      selected: topCandidates[0],
      candidates,
      rejections,
      ambiguous: false,
      ambiguityReason: null,
    };
  }

  const maxSpecificity = Math.max(...topCandidates.map((c) => c.specificityScore));
  const specificCandidates = topCandidates.filter((c) => c.specificityScore === maxSpecificity);

  if (specificCandidates.length === 1) {
    return {
      selected: specificCandidates[0],
      candidates,
      rejections,
      ambiguous: false,
      ambiguityReason: null,
    };
  }

  return {
    selected: null,
    candidates,
    rejections,
    ambiguous: true,
    ambiguityReason: `Multiple equally authoritative rates: ${specificCandidates.map((c) => c.rate.rateCode).join(', ')}`,
  };
}

function computePriority(ctx: PricingContext, item: PricingRateItem): number {
  const conditions = item.applicabilityConditions || {};

  for (const level of PRECEDENCE_LEVELS) {
    if (level.matches(ctx, item)) {
      const hasCustomerMatch = ctx.customerId && conditions.customer_id === ctx.customerId;
      const hasRouteMatch = ctx.origin && conditions.origin === ctx.origin &&
                            ctx.destination && conditions.destination === ctx.destination;
      const hasContainerMatch = ctx.containerType && conditions.container_type === ctx.containerType;

      if (level.priority <= 3 && hasCustomerMatch) return level.priority;
      if (level.priority >= 4 && level.priority <= 6 && hasRouteMatch) return level.priority;
      if (level.priority === 7) return level.priority;

      if (hasCustomerMatch || hasRouteMatch || hasContainerMatch) {
        return level.priority;
      }
    }
  }

  return 7;
}
