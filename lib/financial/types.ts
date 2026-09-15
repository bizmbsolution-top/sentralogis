/**
 * Sentralogis — Phase 5C-5
 * lib/financial/types.ts
 *
 * Canonical Financial Settlement types (ADR-064).
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

import type { PricingCapabilityType, PricingSide } from '../pricing/types';

// ============================================================================
// BILLABLE EVENT STATUS
// ============================================================================

export type BillableEventStatus =
  | 'PENDING'
  | 'INVOICED'
  | 'CANCELLED';

// ============================================================================
// AR/AP SIDE
// ============================================================================

export type ArApSide =
  | 'AR'
  | 'AP';

// ============================================================================
// AR/AP STATUS
// ============================================================================

export type ArApStatus =
  | 'PENDING'
  | 'INVOICED'
  | 'PARTIAL_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'WRITTEN_OFF';

// ============================================================================
// ADJUSTMENT TYPE
// ============================================================================

export type AdjustmentType =
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'REVERSAL'
  | 'WRITE_OFF'
  | 'PRICE_CORRECTION';

// ============================================================================
// BILLABLE EVENT ENTITY
// ============================================================================

export interface BillableEvent {
  id: string;
  tenantId: string;
  salesOrderId: string;
  soLineItemId: string | null;
  sourceQuoteItemId: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  eventType: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  currency: string;
  unitAmount: number;
  totalAmount: number;
  priceSnapshotId: string | null;
  status: BillableEventStatus;
  idempotencyKey: string | null;
  eventTimestamp: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INVOICE ENTITY
// ============================================================================

export interface FinInvoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  salesOrderId: string | null;
  customerId: string | null;
  side: ArApSide;
  status: string;
  invoiceDate: string;
  dueDate: string | null;
  currency: string;
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  totalAmount: number;
  paidAmount: number;
  externalReference: string | null;
  idempotencyKey: string | null;
  sentAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INVOICE LINE ENTITY
// ============================================================================

export interface FinInvoiceLine {
  id: string;
  tenantId: string;
  invoiceId: string;
  billableEventId: string | null;
  soLineItemId: string | null;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitAmount: number;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// AR/AP ENTITY
// ============================================================================

export interface FinArAp {
  id: string;
  tenantId: string;
  invoiceId: string;
  side: ArApSide;
  status: ArApStatus;
  customerId: string | null;
  supplierId: string | null;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: string | null;
  externalReference: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// ADJUSTMENT ENTITY
// ============================================================================

export interface FinAdjustment {
  id: string;
  tenantId: string;
  invoiceId: string | null;
  arApId: string | null;
  adjustmentType: AdjustmentType;
  amount: number;
  currency: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — from IdentityContext)
// ============================================================================

export interface CreateBillableEventInput {
  salesOrderId: string;
  soLineItemId?: string | null;
  sourceQuoteItemId?: string | null;
  capabilityType: PricingCapabilityType;
  side: PricingSide;
  eventType?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  currency: string;
  unitAmount: number;
  totalAmount: number;
  priceSnapshotId?: string | null;
  idempotencyKey?: string | null;
}

export interface CreateInvoiceInput {
  salesOrderId?: string | null;
  customerId?: string | null;
  side: ArApSide;
  invoiceDate?: string;
  dueDate?: string | null;
  currency: string;
  taxPercentage?: number;
  billableEventIds: string[];
  idempotencyKey?: string | null;
}

export interface CreateAdjustmentInput {
  invoiceId?: string | null;
  arApId?: string | null;
  adjustmentType: AdjustmentType;
  amount: number;
  currency: string;
  reason: string;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CreateBillableEventResult {
  billableEvent: BillableEvent;
  created: boolean;
}

export interface CreateInvoiceResult {
  invoice: FinInvoice;
  lines: FinInvoiceLine[];
  arAp: FinArAp;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type FinancialErrorCode =
  | 'INVALID_INPUT'
  | 'BILLABLE_EVENT_NOT_FOUND'
  | 'BILLABLE_EVENT_NOT_OWNED'
  | 'INVOICE_NOT_FOUND'
  | 'INVOICE_NOT_OWNED'
  | 'AR_AP_NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_IDEMPOTENCY'
  | 'DATABASE_ERROR';

export class FinancialError extends Error {
  constructor(
    public readonly code: FinancialErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'FinancialError';
  }
}
