/**
 * Sentralogis — Phase 5C-3
 * lib/sales-order/line-service.ts
 *
 * Canonical SO Line Item commitment service (ADR-059/061/066).
 *
 * Bridges the pricing engine (5C-2) with commercial commitment.
 * Captures price snapshots at SO creation.
 * Ensures immutability after commitment.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type { PricingContext } from '../pricing/selection';
import type { CalculationInput, CalculationResult } from '../pricing/calculation';
import { PricingService } from '../pricing/service';
import type { RateSelectionResult } from '../pricing/selection';
import type { PricingCapabilityType, PricingSide } from '../pricing/types';
import {
  createSOLineItem,
  listSOLineItemsBySO,
  cancelSOLineItem,
  supersedeSOLineItem,
  updateSOLineItemStatus,
} from './line-repository';
import type {
  SalesOrderLineItem,
  CreateSOLineItemInput,
  PriceSnapshot,
  CommitPriceResult,
  AmendSOLineItemInput,
  CancelSOLineItemInput,
} from './line-types';

// ============================================================================
// PRICE SNAPSHOT BUILDER
// ============================================================================

export function buildPriceSnapshot(
  calculationResult: CalculationResult,
  rateId: string | null,
  rateVersionId: string | null,
  selectionExplanation: string | null,
): PriceSnapshot {
  return {
    source_rate_id: rateId,
    source_rate_version_id: rateVersionId,
    unit_rate_snapshot: calculationResult.unitRate,
    quantity_snapshot: calculationResult.quantity,
    currency_snapshot: calculationResult.currency,
    uom_snapshot: calculationResult.chargeBasis,
    calculated_amount: calculationResult.finalAmount,
    snapshot_timestamp: new Date().toISOString(),
    charge_basis: calculationResult.chargeBasis,
    pricing_side: calculationResult.side,
    rounding_precision: getCurrencyPrecision(calculationResult.currency),
    rounding_mode: 'HALF_UP',
    min_charge: null,
    max_charge: null,
    selection_explanation: selectionExplanation,
    calculation_inputs: null,
  };
}

function getCurrencyPrecision(currency: string): number {
  const precision: Record<string, number> = {
    IDR: 0,
    USD: 2,
    EUR: 2,
    JPY: 0,
    SGD: 2,
    CNY: 2,
  };
  return precision[currency] ?? 2;
}

// ============================================================================
// CANONICAL PRICING RESOLUTION (ADR-082)
// ============================================================================

export interface ResolvePricingLineDefinition {
  lineSequence: number;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  serviceDescription: string;
  quantity: number;
  unitOfMeasure: string;
  pricingContext: PricingContext;
}

export async function resolvePricingAndCommit(
  ctx: IdentityContext,
  salesOrderId: string,
  lineDefinitions: ResolvePricingLineDefinition[],
): Promise<CommitPriceResult> {
  assertPermission(ctx, 'commercial:manage');

  const pricingService = new PricingService(ctx);
  const results: SalesOrderLineItem[] = [];
  let totalAmount = 0;
  const currency = lineDefinitions[0]?.pricingContext.currency ?? 'IDR';

  for (const def of lineDefinitions) {
    const selectionResult: RateSelectionResult = await pricingService.resolveRate(def.pricingContext);

    if (!selectionResult.selected) {
      throw new Error(
        `No canonical pricing rate found for capability=${def.pricingContext.capabilityType}, ` +
        `side=${def.pricingContext.side}, ` +
        `effectiveDate=${def.pricingContext.effectiveDate}`,
      );
    }

    const selectedItem = selectionResult.selected.items[0];
    if (!selectedItem) {
      throw new Error(`Selected rate has no items for capability=${def.pricingContext.capabilityType}`);
    }

    const calcInput: CalculationInput = {
      quantity: def.quantity,
      unitRate: selectedItem.unitRate,
      minCharge: selectedItem.minCharge,
      maxCharge: selectedItem.maxCharge,
      currency: selectedItem.currency,
      chargeBasis: selectedItem.chargeBasis,
      side: selectedItem.side,
    };

    const calculationResult: CalculationResult = pricingService.calculateRate(calcInput);

    const priceSnapshot = buildPriceSnapshot(
      calculationResult,
      selectionResult.selected.rate.id,
      selectionResult.selected.version.id,
      selectionResult.selected.rate.rateCode,
    );

    const lineItem = await createSOLineItem(ctx, {
      salesOrderId,
      lineSequence: def.lineSequence,
      sourceQuoteItemId: null,
      capabilityType: def.capabilityType,
      side: def.side,
      serviceDescription: def.serviceDescription,
      quantity: def.quantity,
      unitOfMeasure: def.unitOfMeasure,
      currency: calculationResult.currency,
      unitRate: calculationResult.unitRate,
      lineTotal: calculationResult.finalAmount,
      priceSnapshot,
    });

    results.push(lineItem);
    totalAmount += calculationResult.finalAmount;
  }

  return {
    lineItems: results,
    totalAmount,
    currency,
  };
}

// ============================================================================
// COMMITMENT SERVICE
// ============================================================================

export async function commitPriceToSO(
  ctx: IdentityContext,
  salesOrderId: string,
  lineItems: CreateSOLineItemInput[],
): Promise<CommitPriceResult> {
  assertPermission(ctx, 'commercial:manage');

  const results: SalesOrderLineItem[] = [];
  let totalAmount = 0;
  const currency = lineItems[0]?.currency ?? 'IDR';

  for (const item of lineItems) {
    const lineItem = await createSOLineItem(ctx, item);
    results.push(lineItem);
    totalAmount += item.lineTotal;
  }

  return {
    lineItems: results,
    totalAmount,
    currency,
  };
}

export async function amendSOLineItem(
  ctx: IdentityContext,
  input: AmendSOLineItemInput,
): Promise<SalesOrderLineItem> {
  assertPermission(ctx, 'commercial:manage');

  const existing = await getSOLineItemById(ctx, input.lineItemId);
  if (!existing) {
    throw new Error('SO line item not found');
  }

  if (existing.status === 'CANCELLED' || existing.status === 'SUPERSEDED') {
    throw new Error(`Cannot amend ${existing.status} line item`);
  }

  const newLineItem = await createSOLineItem(ctx, {
    salesOrderId: existing.salesOrderId,
    lineSequence: existing.lineSequence,
    sourceQuoteItemId: existing.sourceQuoteItemId,
    capabilityType: existing.capabilityType,
    side: existing.side,
    serviceDescription: input.newServiceDescription ?? existing.serviceDescription,
    quantity: input.newQuantity ?? existing.quantity,
    unitOfMeasure: existing.unitOfMeasure,
    currency: existing.currency,
    unitRate: input.newUnitRate ?? existing.unitRate,
    lineTotal: (input.newQuantity ?? existing.quantity) * (input.newUnitRate ?? existing.unitRate),
    priceSnapshot: existing.priceSnapshot,
  });

  await supersedeSOLineItem(ctx, existing.id, newLineItem.id);

  return newLineItem;
}

export async function cancelLineItem(
  ctx: IdentityContext,
  input: CancelSOLineItemInput,
): Promise<SalesOrderLineItem> {
  assertPermission(ctx, 'commercial:manage');

  return cancelSOLineItem(ctx, input.lineItemId, input.reason);
}

export async function confirmSOLineItems(
  ctx: IdentityContext,
  salesOrderId: string,
): Promise<SalesOrderLineItem[]> {
  assertPermission(ctx, 'commercial:manage');

  const lineItems = await listSOLineItemsBySO(ctx, salesOrderId);
  const confirmed: SalesOrderLineItem[] = [];

  for (const item of lineItems) {
    if (item.status === 'DRAFT') {
      const updated = await updateSOLineItemStatus(ctx, item.id, 'ACTIVE');
      confirmed.push(updated);
    }
  }

  return confirmed;
}

async function getSOLineItemById(
  ctx: IdentityContext,
  lineItemId: string,
): Promise<SalesOrderLineItem | null> {
  assertPermission(ctx, 'commercial:read');

  const { supabaseAdmin } = await import('@/lib/supabase/admin');
  const { data, error } = await supabaseAdmin
    .from('sales_order_line_items')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', lineItemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch SO line item: ${error.message}`);
  }

  return data as unknown as SalesOrderLineItem | null;
}
