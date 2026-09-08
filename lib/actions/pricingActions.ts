'use server';

import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { PricingService } from '@/lib/pricing/service';
import type { PricingContext, RateSelectionResult } from '@/lib/pricing/selection';
import type { CalculationInput, CalculationResult } from '@/lib/pricing/calculation';

export interface CanonicalPricingResolveInput {
  context: PricingContext;
}

export interface CanonicalPricingResolveResult {
  selection: RateSelectionResult | null;
  calculation: CalculationResult | null;
}

export async function resolveCanonicalPricing(
  input: CanonicalPricingResolveInput,
): Promise<CanonicalPricingResolveResult> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const service = new PricingService(ctx);
  const selection = await service.resolveRate(input.context);

  if (!selection.selected) {
    return { selection, calculation: null };
  }

  const item = selection.selected.items[0];
  if (!item) {
    return { selection, calculation: null };
  }

  const calcInput: CalculationInput = {
    quantity: 1,
    unitRate: item.unitRate,
    minCharge: item.minCharge,
    maxCharge: item.maxCharge,
    currency: item.currency,
    chargeBasis: item.chargeBasis,
    side: item.side,
  };

  const calculation = service.calculateRate(calcInput);

  return { selection, calculation };
}
