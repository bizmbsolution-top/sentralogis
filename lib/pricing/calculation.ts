/**
 * Sentralogis — Phase 5C-2
 * lib/pricing/calculation.ts
 *
 * Canonical Pricing Calculation Engine (ADR-062).
 *
 * Pure, deterministic calculation functions.
 * No database mutations. No side effects.
 */

import type { PricingRateItem, PricingSide } from './types';

// ============================================================================
// CALCULATION INPUT
// ============================================================================

export interface CalculationInput {
  quantity: number;
  unitRate: number;
  minCharge: number | null;
  maxCharge: number | null;
  currency: string;
  chargeBasis: string;
  side: PricingSide;
}

// ============================================================================
// CALCULATION RESULT
// ============================================================================

export interface CalculationResult {
  baseAmount: number;
  minApplied: boolean;
  maxApplied: boolean;
  finalAmount: number;
  currency: string;
  chargeBasis: string;
  side: PricingSide;
  quantity: number;
  unitRate: number;
  calculationSteps: CalculationStep[];
}

export interface CalculationStep {
  step: string;
  operation: string;
  input: number;
  output: number;
}

// ============================================================================
// CURRENCY PRECISION (ADR-062)
// ============================================================================

const CURRENCY_PRECISION: Record<string, number> = {
  IDR: 0,
  USD: 2,
  EUR: 2,
  JPY: 0,
  SGD: 2,
  CNY: 2,
};

function getCurrencyPrecision(currency: string): number {
  return CURRENCY_PRECISION[currency] ?? 2;
}

// ============================================================================
// ROUNDING (HALF_UP)
// ============================================================================

function roundHalfUp(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

// ============================================================================
// PURE CALCULATION
// ============================================================================

export function calculateRate(input: CalculationInput): CalculationResult {
  const steps: CalculationStep[] = [];
  const precision = getCurrencyPrecision(input.currency);

  if (input.quantity < 0) {
    throw new Error('Quantity cannot be negative');
  }

  if (input.unitRate < 0) {
    throw new Error('Unit rate cannot be negative');
  }

  const baseAmount = roundHalfUp(input.quantity * input.unitRate, precision + 4);
  steps.push({
    step: 'base_calculation',
    operation: 'quantity × unit_rate',
    input: input.quantity,
    output: baseAmount,
  });

  let workingAmount = baseAmount;
  let minApplied = false;
  let maxApplied = false;

  if (input.minCharge !== null && input.minCharge > 0 && workingAmount < input.minCharge) {
    minApplied = true;
    workingAmount = input.minCharge;
    steps.push({
      step: 'minimum_charge',
      operation: 'max(base, min_charge)',
      input: baseAmount,
      output: workingAmount,
    });
  }

  if (input.maxCharge !== null && input.maxCharge > 0 && workingAmount > input.maxCharge) {
    maxApplied = true;
    workingAmount = input.maxCharge;
    steps.push({
      step: 'maximum_charge',
      operation: 'min(working, max_charge)',
      input: baseAmount,
      output: workingAmount,
    });
  }

  const finalAmount = roundHalfUp(workingAmount, precision);
  steps.push({
    step: 'final_rounding',
    operation: `round_half_up(${precision}dp)`,
    input: workingAmount,
    output: finalAmount,
  });

  return {
    baseAmount,
    minApplied,
    maxApplied,
    finalAmount,
    currency: input.currency,
    chargeBasis: input.chargeBasis,
    side: input.side,
    quantity: input.quantity,
    unitRate: input.unitRate,
    calculationSteps: steps,
  };
}

// ============================================================================
// BATCH CALCULATION (multiple items)
// ============================================================================

export interface BatchCalculationResult {
  results: CalculationResult[];
  totalAmount: number;
  currency: string;
  side: PricingSide;
}

export function calculateBatch(
  items: CalculationInput[],
): BatchCalculationResult {
  if (items.length === 0) {
    throw new Error('Cannot calculate empty batch');
  }

  const results = items.map((item) => calculateRate(item));
  const currency = items[0].currency;
  const side = items[0].side;

  const allSameCurrency = items.every((i) => i.currency === currency);
  if (!allSameCurrency) {
    throw new Error('All items in a batch must have the same currency');
  }

  const precision = getCurrencyPrecision(currency);
  const totalAmount = roundHalfUp(
    results.reduce((sum, r) => sum + r.finalAmount, 0),
    precision,
  );

  return {
    results,
    totalAmount,
    currency,
    side,
  };
}
