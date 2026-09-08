/**
 * Sentralogis — Phase 5D-5
 * lib/accounting/types.ts
 *
 * Canonical Accounting domain types (ADR-064/069).
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

// ============================================================================
// ACCOUNTING EVENT STATUS
// ============================================================================

export type AccountingEventStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'DISPATCHED'
  | 'ACKNOWLEDGED'
  | 'REJECTED'
  | 'FAILED';

// ============================================================================
// ACCOUNTING EVENT TYPE
// ============================================================================

export type AccountingEventType =
  | 'INVOICE_ISSUED'
  | 'INVOICE_ADJUSTED'
  | 'INVOICE_REVERSED'
  | 'AR_PAYMENT_APPLIED'
  | 'AR_PAYMENT_REVERSED'
  | 'AP_BILL_RECORDED'
  | 'AP_BILL_ADJUSTED'
  | 'AP_BILL_REVERSED'
  | 'AP_PAYMENT_APPLIED'
  | 'AP_PAYMENT_REVERSED'
  | 'SETTLEMENT_COMPLETED'
  | 'SETTLEMENT_REVERSED'
  | 'ADJUSTMENT'
  | 'REVERSAL';

// ============================================================================
// LINE TYPE
// ============================================================================

export type AccountingLineType =
  | 'DEBIT'
  | 'CREDIT';

// ============================================================================
// ACCOUNTING EVENT ENTITY
// ============================================================================

export interface AccountingEvent {
  id: string;
  tenantId: string;
  eventType: AccountingEventType;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceReference: string | null;
  accountingDate: string;
  currency: string;
  fxRate: number | null;
  fxCurrency: string | null;
  fxTimestamp: string | null;
  totalDebit: number;
  totalCredit: number;
  status: AccountingEventStatus;
  idempotencyKey: string;
  externalCorrelationId: string | null;
  externalSystem: string | null;
  acknowledgedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// ACCOUNTING EVENT LINE ENTITY
// ============================================================================

export interface AccountingEventLine {
  id: string;
  tenantId: string;
  accountingEventId: string;
  lineType: AccountingLineType;
  accountCode: string;
  description: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// ACCOUNTING PROVIDER ENTITY
// ============================================================================

export interface AccountingProvider {
  id: string;
  tenantId: string;
  providerCode: string;
  providerName: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — from IdentityContext)
// ============================================================================

export interface AccountingLineInput {
  lineType: AccountingLineType;
  accountCode: string;
  description?: string | null;
  amount: number;
  currency: string;
}

export interface CreateAccountingEventInput {
  eventType: AccountingEventType;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceReference?: string | null;
  accountingDate?: string;
  currency: string;
  fxRate?: number | null;
  fxCurrency?: string | null;
  fxTimestamp?: string | null;
  lines: AccountingLineInput[];
  externalSystem?: string | null;
}

export interface CreateAccountingProviderInput {
  providerCode: string;
  providerName: string;
  config?: Record<string, unknown>;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CreateAccountingEventResult {
  event: AccountingEvent;
  lines: AccountingEventLine[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type AccountingErrorCode =
  | 'ACCOUNTING_EVENT_NOT_FOUND'
  | 'ACCOUNTING_EVENT_NOT_OWNED'
  | 'UNBALANCED_JOURNAL'
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_IDEMPOTENCY'
  | 'PROVIDER_NOT_FOUND'
  | 'DATABASE_ERROR';

export class AccountingError extends Error {
  constructor(
    public readonly code: AccountingErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'AccountingError';
  }
}
