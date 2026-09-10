/**
 * Sentralogis — Phase 5C-3
 * lib/sales-order/line-types.ts
 *
 * Canonical Sales Order Line Item + Price Snapshot types (ADR-059/061/066).
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

import type { PricingCapabilityType, PricingSide } from '../pricing/types';
import type { PricingContext } from '../pricing/selection';

// ============================================================================
// SO LINE ITEM STATUS
// ============================================================================

export type SOLineItemStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'CANCELLED'
  | 'SUPERSEDED';

// ============================================================================
// PRICE SNAPSHOT (ADR-059/066 — immutable commercial truth)
// ============================================================================

export interface PriceSnapshot {
  source_rate_id: string | null;
  source_rate_version_id: string | null;
  unit_rate_snapshot: number;
  quantity_snapshot: number;
  currency_snapshot: string;
  uom_snapshot: string;
  calculated_amount: number;
  snapshot_timestamp: string;
  charge_basis: string;
  pricing_side: PricingSide;
  rounding_precision: number;
  rounding_mode: string;
  min_charge: number | null;
  max_charge: number | null;
  selection_explanation: string | null;
  calculation_inputs: Record<string, unknown> | null;
}

// ============================================================================
// SO LINE ITEM ENTITY
// ============================================================================

export interface SalesOrderLineItem {
  id: string;
  tenantId: string;
  salesOrderId: string;
  lineSequence: number;
  sourceQuoteItemId: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  serviceDescription: string;
  quantity: number;
  unitOfMeasure: string;
  currency: string;
  unitRate: number;
  lineTotal: number;
  priceSnapshot: PriceSnapshot;
  status: SOLineItemStatus;
  versionNo: number;
  supersededBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — from IdentityContext)
// ============================================================================

export interface CreateSOLineItemInput {
  salesOrderId: string;
  lineSequence: number;
  sourceQuoteItemId?: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  serviceDescription: string;
  quantity: number;
  unitOfMeasure: string;
  currency: string;
  unitRate: number;
  lineTotal: number;
  priceSnapshot: PriceSnapshot;
}

export interface CommitPriceInput {
  salesOrderId: string;
  lineItems: CreateSOLineItemInput[];
}

export interface ResolvePricingLineDefinition {
  lineSequence: number;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  serviceDescription: string;
  quantity: number;
  unitOfMeasure: string;
  pricingContext: PricingContext;
}

export interface AmendSOLineItemInput {
  lineItemId: string;
  reason: string;
  newQuantity?: number;
  newUnitRate?: number;
  newServiceDescription?: string;
}

export interface CancelSOLineItemInput {
  lineItemId: string;
  reason: string;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CreateSOLineItemResult {
  lineItem: SalesOrderLineItem;
  created: boolean;
}

export interface CommitPriceResult {
  lineItems: SalesOrderLineItem[];
  totalAmount: number;
  currency: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type SOLineItemErrorCode =
  | 'SO_LINE_ITEM_NOT_FOUND'
  | 'SO_LINE_ITEM_NOT_OWNED'
  | 'SO_NOT_FOUND'
  | 'SO_NOT_EDITABLE'
  | 'SO_LINE_IMMUTABLE'
  | 'QUOTE_ITEM_NOT_FOUND'
  | 'QUOTE_ITEM_NOT_OWNED'
  | 'DUPLICATE_LINE'
  | 'INVALID_AMENDMENT'
  | 'DATABASE_ERROR';

export class SOLineItemError extends Error {
  constructor(
    public readonly code: SOLineItemErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'SOLineItemError';
  }
}
