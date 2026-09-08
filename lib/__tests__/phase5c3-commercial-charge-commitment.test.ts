import { describe, test, expect } from 'vitest';
import type { PriceSnapshot } from '../sales-order/line-types';
import type { CalculationResult } from '../pricing/calculation';
import { buildPriceSnapshot } from '../sales-order/line-service';

// ============================================================================
// FIXTURES
// ============================================================================

function makeCalculationResult(overrides: Partial<CalculationResult> = {}): CalculationResult {
  return {
    baseAmount: 12000,
    minApplied: false,
    maxApplied: false,
    finalAmount: 12000,
    currency: 'USD',
    chargeBasis: 'CONTAINER',
    side: 'SELL',
    quantity: 10,
    unitRate: 1200,
    calculationSteps: [],
    ...overrides,
  };
}

// ============================================================================
// PRICE SNAPSHOT TESTS
// ============================================================================

describe('Phase 5C-3 Price Snapshot', () => {
  test('buildPriceSnapshot captures all required fields', () => {
    const calc = makeCalculationResult();
    const snapshot = buildPriceSnapshot(calc, 'rate-1', 'version-1', 'Best match');

    expect(snapshot.source_rate_id).toBe('rate-1');
    expect(snapshot.source_rate_version_id).toBe('version-1');
    expect(snapshot.unit_rate_snapshot).toBe(1200);
    expect(snapshot.quantity_snapshot).toBe(10);
    expect(snapshot.currency_snapshot).toBe('USD');
    expect(snapshot.uom_snapshot).toBe('CONTAINER');
    expect(snapshot.calculated_amount).toBe(12000);
    expect(snapshot.pricing_side).toBe('SELL');
    expect(snapshot.selection_explanation).toBe('Best match');
    expect(snapshot.rounding_mode).toBe('HALF_UP');
    expect(snapshot.snapshot_timestamp).toBeDefined();
  });

  test('buildPriceSnapshot uses correct currency precision', () => {
    const usdCalc = makeCalculationResult({ currency: 'USD' });
    const usdSnapshot = buildPriceSnapshot(usdCalc, null, null, null);
    expect(usdSnapshot.rounding_precision).toBe(2);

    const idrCalc = makeCalculationResult({ currency: 'IDR' });
    const idrSnapshot = buildPriceSnapshot(idrCalc, null, null, null);
    expect(idrSnapshot.rounding_precision).toBe(0);
  });

  test('buildPriceSnapshot preserves null rate references', () => {
    const calc = makeCalculationResult();
    const snapshot = buildPriceSnapshot(calc, null, null, null);

    expect(snapshot.source_rate_id).toBeNull();
    expect(snapshot.source_rate_version_id).toBeNull();
    expect(snapshot.selection_explanation).toBeNull();
  });

  test('buildPriceSnapshot captures BUY side', () => {
    const calc = makeCalculationResult({ side: 'BUY', unitRate: 900, finalAmount: 9000 });
    const snapshot = buildPriceSnapshot(calc, 'rate-2', 'version-1', null);

    expect(snapshot.pricing_side).toBe('BUY');
    expect(snapshot.unit_rate_snapshot).toBe(900);
    expect(snapshot.calculated_amount).toBe(9000);
  });

  test('snapshot is immutable after creation', () => {
    const calc = makeCalculationResult();
    const snapshot = buildPriceSnapshot(calc, 'rate-1', 'version-1', null);

    const originalAmount = snapshot.calculated_amount;
    const originalCurrency = snapshot.currency_snapshot;

    expect(snapshot.calculated_amount).toBe(originalAmount);
    expect(snapshot.currency_snapshot).toBe(originalCurrency);
  });
});

// ============================================================================
// SO LINE ITEM TYPE TESTS
// ============================================================================

describe('Phase 5C-3 SO Line Item Types', () => {
  test('PriceSnapshot has all required fields', () => {
    const snapshot: PriceSnapshot = {
      source_rate_id: 'rate-1',
      source_rate_version_id: 'version-1',
      unit_rate_snapshot: 1500,
      quantity_snapshot: 10,
      currency_snapshot: 'USD',
      uom_snapshot: 'CONTAINER',
      calculated_amount: 15000,
      snapshot_timestamp: '2026-09-01T00:00:00Z',
      charge_basis: 'CONTAINER',
      pricing_side: 'SELL',
      rounding_precision: 2,
      rounding_mode: 'HALF_UP',
      min_charge: null,
      max_charge: null,
      selection_explanation: 'Best match',
      calculation_inputs: null,
    };

    expect(snapshot.source_rate_id).toBeDefined();
    expect(snapshot.source_rate_version_id).toBeDefined();
    expect(snapshot.unit_rate_snapshot).toBe(1500);
    expect(snapshot.calculated_amount).toBe(15000);
  });
});

// ============================================================================
// IMMUTABILITY TESTS
// ============================================================================

describe('Phase 5C-3 Immutability', () => {
  test('rate master change does not affect committed snapshot', () => {
    const calc = makeCalculationResult({ unitRate: 1200, finalAmount: 12000 });
    const snapshot = buildPriceSnapshot(calc, 'rate-1', 'version-1', null);

    const committedAmount = snapshot.calculated_amount;
    const committedRate = snapshot.unit_rate_snapshot;

    expect(committedAmount).toBe(12000);
    expect(committedRate).toBe(1200);
  });
});
