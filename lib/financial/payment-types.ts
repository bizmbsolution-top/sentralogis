/**
 * Sentralogis — Phase 5D-3
 * lib/financial/payment-types.ts
 *
 * Canonical Payment, Allocation, Settlement & Reconciliation types (ADR-067/068/069).
 *
 * Security invariant: input DTOs contain NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the IdentityContext at call time.
 */

// ============================================================================
// PAYMENT STATUS (ADR-067)
// ============================================================================

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ALLOCATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REVERSED';

// ============================================================================
// ALLOCATION STATUS (ADR-068)
// ============================================================================

export type AllocationStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'SETTLED'
  | 'REVERSED';

// ============================================================================
// SETTLEMENT STATUS (ADR-067)
// ============================================================================

export type SettlementStatus =
  | 'OPEN'
  | 'PARTIAL'
  | 'SETTLED'
  | 'REVERSED';

// ============================================================================
// RECONCILIATION STATUS (ADR-069)
// ============================================================================

export type ReconciliationStatus =
  | 'UNMATCHED'
  | 'MATCHED'
  | 'PARTIAL'
  | 'REVERSED';

// ============================================================================
// PAYMENT DIRECTION
// ============================================================================

export type PaymentDirection =
  | 'AR'
  | 'AP';

// ============================================================================
// PAYMENT ENTITY
// ============================================================================

export interface FinPayment {
  id: string;
  tenantId: string;
  paymentNumber: string;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  paymentDate: string;
  valueDate: string | null;
  reference: string | null;
  method: string | null;
  status: PaymentStatus;
  fxRate: number | null;
  fxCurrency: string | null;
  fxTimestamp: string | null;
  externalReference: string | null;
  sourceMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// ALLOCATION ENTITY
// ============================================================================

export interface FinAllocation {
  id: string;
  tenantId: string;
  paymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: AllocationStatus;
  allocatedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// SETTLEMENT ENTITY
// ============================================================================

export interface FinSettlement {
  id: string;
  tenantId: string;
  allocationId: string;
  status: SettlementStatus;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// RECONCILIATION ENTITY
// ============================================================================

export interface FinReconciliation {
  id: string;
  tenantId: string;
  paymentId: string | null;
  externalReference: string | null;
  externalAmount: number | null;
  externalCurrency: string | null;
  externalDate: string | null;
  status: ReconciliationStatus;
  matchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// INPUT DTOs (NO tenantId — from IdentityContext)
// ============================================================================

export interface CreatePaymentInput {
  direction: PaymentDirection;
  amount: number;
  currency: string;
  paymentDate?: string;
  valueDate?: string | null;
  reference?: string | null;
  method?: string | null;
  externalReference?: string | null;
  sourceMetadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
}

export interface CreateAllocationInput {
  paymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
}

export interface CreateSettlementInput {
  allocationId: string;
}

export interface CreateReconciliationInput {
  paymentId?: string | null;
  externalReference?: string | null;
  externalAmount?: number | null;
  externalCurrency?: string | null;
  externalDate?: string | null;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CreatePaymentResult {
  payment: FinPayment;
  created: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type PaymentErrorCode =
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_NOT_OWNED'
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_IDEMPOTENCY'
  | 'ALLOCATION_EXCEEDS_PAYMENT'
  | 'DATABASE_ERROR';

export class PaymentError extends Error {
  constructor(
    public readonly code: PaymentErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
