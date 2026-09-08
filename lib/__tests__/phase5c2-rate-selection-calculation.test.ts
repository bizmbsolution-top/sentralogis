import { describe, test, expect } from 'vitest';
import {
  selectRate,
  type PricingContext,
  type RateCandidate,
} from '../pricing/selection';
import {
  calculateRate,
  calculateBatch,
  type CalculationInput,
} from '../pricing/calculation';
import type {
  PricingRate,
  PricingRateVersion,
  PricingRateItem,
  PricingCapabilityType,
  PricingSide,
} from '../pricing/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function makeRate(overrides: Partial<PricingRate> = {}): PricingRate {
  return {
    id: 'rate-1',
    tenantId: 'tenant-1',
    rateCode: 'OCEAN-FCL',
    capabilityType: 'FORWARDING',
    rateDescription: 'Ocean FCL',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeVersion(overrides: Partial<PricingRateVersion> = {}): PricingRateVersion {
  return {
    id: 'version-1',
    rateId: 'rate-1',
    tenantId: 'tenant-1',
    versionNo: 1,
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<PricingRateItem> = {}): PricingRateItem {
  return {
    id: 'item-1',
    rateVersionId: 'version-1',
    tenantId: 'tenant-1',
    side: 'SELL',
    chargeBasis: 'CONTAINER',
    unitOfMeasure: 'CONTAINER',
    currency: 'USD',
    unitRate: 1500,
    minCharge: null,
    maxCharge: null,
    applicabilityConditions: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeContext(overrides: Partial<PricingContext> = {}): PricingContext {
  return {
    capabilityType: 'FORWARDING',
    side: 'SELL',
    effectiveDate: '2026-06-15',
    customerId: null,
    origin: null,
    destination: null,
    serviceType: null,
    containerType: null,
    chargeBasis: null,
    currency: null,
    ...overrides,
  };
}

// ============================================================================
// SELECTION TESTS
// ============================================================================

describe('Phase 5C-2 Rate Selection', () => {
  describe('Eligibility', () => {
    test('rejects inactive version', () => {
      const rate = makeRate();
      const version = makeVersion({ status: 'DRAFT' });
      const item = makeItem();
      const ctx = makeContext();

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.rejections).toHaveLength(1);
      expect(result.rejections[0].reason).toContain('DRAFT');
    });

    test('rejects wrong side', () => {
      const rate = makeRate();
      const version = makeVersion();
      const item = makeItem({ side: 'BUY' });
      const ctx = makeContext({ side: 'SELL' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.rejections[0].reason).toContain('Side mismatch');
    });

    test('rejects wrong currency', () => {
      const rate = makeRate();
      const version = makeVersion();
      const item = makeItem({ currency: 'IDR' });
      const ctx = makeContext({ currency: 'USD' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.rejections[0].reason).toContain('Currency mismatch');
    });

    test('rejects pricing date before effective_from', () => {
      const rate = makeRate();
      const version = makeVersion({ effectiveFrom: '2026-06-01' });
      const item = makeItem();
      const ctx = makeContext({ effectiveDate: '2026-05-01' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.rejections[0].reason).toContain('before effective_from');
    });

    test('rejects pricing date >= effective_to', () => {
      const rate = makeRate();
      const version = makeVersion({ effectiveTo: '2026-06-01' });
      const item = makeItem();
      const ctx = makeContext({ effectiveDate: '2026-06-01' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.rejections[0].reason).toContain('>= effective_to');
    });

    test('accepts NULL effective_to as open-ended', () => {
      const rate = makeRate();
      const version = makeVersion({ effectiveFrom: '2026-01-01', effectiveTo: null });
      const item = makeItem();
      const ctx = makeContext({ effectiveDate: '2027-01-01' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).not.toBeNull();
    });
  });

  describe('Precedence', () => {
    test('selects exact match over generic', () => {
      const genericRate = makeRate({ id: 'rate-generic', rateCode: 'OCEAN-GENERIC' });
      const specificRate = makeRate({ id: 'rate-specific', rateCode: 'OCEAN-BYD' });

      const genericVersion = makeVersion({ id: 'version-generic', rateId: 'rate-generic' });
      const specificVersion = makeVersion({ id: 'version-specific', rateId: 'rate-specific' });

      const genericItem = makeItem({ id: 'item-generic', rateVersionId: 'version-generic' });
      const specificItem = makeItem({
        id: 'item-specific',
        rateVersionId: 'version-specific',
        applicabilityConditions: { customer_id: 'byd-123' },
      });

      const ctx = makeContext({ customerId: 'byd-123' });

      const result = selectRate(
        [genericRate, specificRate],
        [genericVersion, specificVersion],
        [genericItem, specificItem],
        ctx,
      );

      expect(result.selected).not.toBeNull();
      expect(result.selected!.rate.id).toBe('rate-specific');
    });

    test('detects ambiguity when two rates have equal precedence', () => {
      const rate1 = makeRate({ id: 'rate-1', rateCode: 'OCEAN-A' });
      const rate2 = makeRate({ id: 'rate-2', rateCode: 'OCEAN-B' });

      const version1 = makeVersion({ id: 'version-1', rateId: 'rate-1' });
      const version2 = makeVersion({ id: 'version-2', rateId: 'rate-2' });

      const item1 = makeItem({ id: 'item-1', rateVersionId: 'version-1' });
      const item2 = makeItem({ id: 'item-2', rateVersionId: 'version-2' });

      const ctx = makeContext();

      const result = selectRate([rate1, rate2], [version1, version2], [item1, item2], ctx);

      expect(result.selected).toBeNull();
      expect(result.ambiguous).toBe(true);
      expect(result.ambiguityReason).toContain('OCEAN-A');
      expect(result.ambiguityReason).toContain('OCEAN-B');
    });

    test('returns null when no candidates match', () => {
      const rate = makeRate({ capabilityType: 'TRUCKING' });
      const version = makeVersion();
      const item = makeItem();
      const ctx = makeContext({ capabilityType: 'FORWARDING' });

      const result = selectRate([rate], [version], [item], ctx);

      expect(result.selected).toBeNull();
      expect(result.candidates).toHaveLength(0);
    });
  });

  describe('Determinism', () => {
    test('produces same result for repeated identical inputs', () => {
      const rate = makeRate();
      const version = makeVersion();
      const item = makeItem();
      const ctx = makeContext();

      const result1 = selectRate([rate], [version], [item], ctx);
      const result2 = selectRate([rate], [version], [item], ctx);

      expect(result1.selected?.rate.id).toBe(result2.selected?.rate.id);
      expect(result1.ambiguous).toBe(result2.ambiguous);
    });
  });
});

// ============================================================================
// CALCULATION TESTS
// ============================================================================

describe('Phase 5C-2 Calculation', () => {
  describe('Base Calculation', () => {
    test('quantity × unit_rate', () => {
      const result = calculateRate({
        quantity: 4,
        unitRate: 1500,
        minCharge: null,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      expect(result.baseAmount).toBe(6000);
      expect(result.finalAmount).toBe(6000);
      expect(result.currency).toBe('USD');
      expect(result.side).toBe('SELL');
    });

    test('applies minimum charge', () => {
      const result = calculateRate({
        quantity: 0.5,
        unitRate: 1500,
        minCharge: 1000,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      expect(result.baseAmount).toBe(750);
      expect(result.minApplied).toBe(true);
      expect(result.finalAmount).toBe(1000);
    });

    test('applies maximum charge', () => {
      const result = calculateRate({
        quantity: 100,
        unitRate: 1500,
        minCharge: null,
        maxCharge: 5000,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      expect(result.baseAmount).toBe(150000);
      expect(result.maxApplied).toBe(true);
      expect(result.finalAmount).toBe(5000);
    });

    test('rejects negative quantity', () => {
      expect(() =>
        calculateRate({
          quantity: -1,
          unitRate: 1500,
          minCharge: null,
          maxCharge: null,
          currency: 'USD',
          chargeBasis: 'CONTAINER',
          side: 'SELL',
        }),
      ).toThrow('Quantity cannot be negative');
    });
  });

  describe('Rounding', () => {
    test('IDR rounds to 0 decimals', () => {
      const result = calculateRate({
        quantity: 1,
        unitRate: 1500.555,
        minCharge: null,
        maxCharge: null,
        currency: 'IDR',
        chargeBasis: 'DOCUMENT',
        side: 'SELL',
      });

      expect(result.finalAmount).toBe(1501);
    });

    test('USD rounds to 2 decimals', () => {
      const result = calculateRate({
        quantity: 1,
        unitRate: 1500.555,
        minCharge: null,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      expect(result.finalAmount).toBe(1500.56);
    });
  });

  describe('BUY/SELL Independence', () => {
    test('BUY and SELL produce independent results', () => {
      const sellResult = calculateRate({
        quantity: 1,
        unitRate: 1300,
        minCharge: null,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      const buyResult = calculateRate({
        quantity: 1,
        unitRate: 1000,
        minCharge: null,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'BUY',
      });

      expect(sellResult.finalAmount).toBe(1300);
      expect(buyResult.finalAmount).toBe(1000);
      expect(sellResult.side).toBe('SELL');
      expect(buyResult.side).toBe('BUY');
    });
  });

  describe('Determinism', () => {
    test('produces same result for repeated identical inputs', () => {
      const input: CalculationInput = {
        quantity: 5,
        unitRate: 1200.5,
        minCharge: 1000,
        maxCharge: 10000,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      };

      const result1 = calculateRate(input);
      const result2 = calculateRate(input);

      expect(result1.finalAmount).toBe(result2.finalAmount);
      expect(result1.baseAmount).toBe(result2.baseAmount);
      expect(result1.minApplied).toBe(result2.minApplied);
      expect(result1.maxApplied).toBe(result2.maxApplied);
    });
  });

  describe('Explainability', () => {
    test('returns calculation steps', () => {
      const result = calculateRate({
        quantity: 4,
        unitRate: 1500,
        minCharge: 5000,
        maxCharge: null,
        currency: 'USD',
        chargeBasis: 'CONTAINER',
        side: 'SELL',
      });

      expect(result.calculationSteps.length).toBeGreaterThan(0);
      expect(result.calculationSteps[0].step).toBe('base_calculation');
    });
  });
});
