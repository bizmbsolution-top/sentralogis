/**
 * Sentralogis — Phase 5C-2
 * lib/pricing/service.ts
 *
 * Canonical Pricing domain service facade (ADR-057 through ADR-065).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Rate identity is DB-generated UUID.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import {
  createPricingRate,
  getPricingRateByCode,
  listPricingRates,
  createPricingRateVersion,
  listPricingRateVersions,
  createPricingRateItem,
  listPricingRateItems,
} from './repository';
import type {
  PricingRate,
  PricingRateVersion,
  PricingRateItem,
  CreatePricingRateInput,
  CreatePricingRateVersionInput,
  CreatePricingRateItemInput,
  CreatePricingRateResult,
} from './types';
import { selectRate, type PricingContext, type RateSelectionResult } from './selection';
import { calculateRate, type CalculationInput, type CalculationResult } from './calculation';

export class PricingService {
  constructor(private readonly ctx: IdentityContext) {}

  async createRate(input: CreatePricingRateInput): Promise<PricingRate> {
    return createPricingRate(this.ctx, input);
  }

  async getRateByCode(rateCode: string): Promise<PricingRate | null> {
    return getPricingRateByCode(this.ctx, rateCode);
  }

  async listRates(capabilityType?: string): Promise<PricingRate[]> {
    return listPricingRates(this.ctx, capabilityType);
  }

  async createRateVersion(input: CreatePricingRateVersionInput): Promise<PricingRateVersion> {
    return createPricingRateVersion(this.ctx, input);
  }

  async listRateVersions(rateId: string): Promise<PricingRateVersion[]> {
    return listPricingRateVersions(this.ctx, rateId);
  }

  async createRateItem(input: CreatePricingRateItemInput): Promise<PricingRateItem> {
    return createPricingRateItem(this.ctx, input);
  }

  async listRateItems(rateVersionId: string): Promise<PricingRateItem[]> {
    return listPricingRateItems(this.ctx, rateVersionId);
  }

  async resolveRate(context: PricingContext): Promise<RateSelectionResult> {
    const rates = await listPricingRates(this.ctx, context.capabilityType);

    const versions: PricingRateVersion[] = [];
    const items: PricingRateItem[] = [];

    for (const rate of rates) {
      const rateVersions = await listPricingRateVersions(this.ctx, rate.id);
      versions.push(...rateVersions);

      for (const version of rateVersions) {
        const versionItems = await listPricingRateItems(this.ctx, version.id);
        items.push(...versionItems);
      }
    }

    return selectRate(rates, versions, items, context);
  }

  calculateRate(input: CalculationInput): CalculationResult {
    return calculateRate(input);
  }
}

export type { CreatePricingRateResult };
