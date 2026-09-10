/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/types.ts
 *
 * Canonical Operational Handoff types (ADR-051 .. ADR-056).
 *
 * Security invariant: Tenant and user identity are derived EXCLUSIVELY
 * from the trusted IdentityContext at call time.
 *
 * Business identity is `handoff_number` allocated ONLY by the canonical
 * `next_operational_handoff_number()` (ADR-051). Client code MUST NOT
 * generate canonical handoff numbers.
 */

// ============================================================================
// OPERATIONAL HANDOFF STATUS (mirrors com_operational_handoff_status enum)
// ============================================================================

export type OperationalHandoffStatus =
  | 'ISSUED'
  | 'ACKNOWLEDGED'
  | 'ACCEPTED'
  | 'EXECUTING'
  | 'FULFILLED'
  | 'FAILED'
  | 'REJECTED'
  | 'CANCELLED';

/** Active statuses (non-terminal). */
export const HANDOFF_ACTIVE_STATUSES: readonly OperationalHandoffStatus[] = [
  'ISSUED',
  'ACKNOWLEDGED',
  'ACCEPTED',
  'EXECUTING',
];

/** Terminal statuses. */
export const HANDOFF_TERMINAL_STATUSES: readonly OperationalHandoffStatus[] = [
  'FULFILLED',
  'FAILED',
  'REJECTED',
  'CANCELLED',
];

/** Valid state transitions (ADR-051 / ADR-056). */
export const OPERATIONAL_HANDOFF_TRANSITIONS: Record<
  OperationalHandoffStatus,
  readonly OperationalHandoffStatus[]
> = {
  ISSUED: ['ACKNOWLEDGED', 'ACCEPTED', 'FAILED', 'REJECTED', 'CANCELLED'],
  ACKNOWLEDGED: ['ACCEPTED', 'EXECUTING', 'FAILED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['EXECUTING', 'FULFILLED', 'FAILED', 'REJECTED', 'CANCELLED'],
  EXECUTING: ['FULFILLED', 'FAILED', 'CANCELLED'],
  FULFILLED: [],
  FAILED: [],
  REJECTED: [],
  CANCELLED: [],
};

// ============================================================================
// TARGET DOMAIN
// ============================================================================

export type TargetDomain =
  | 'FORWARDING'
  | 'CUSTOMS'
  | 'TRUCKING'
  | 'WAREHOUSE';

export const VALID_TARGET_DOMAINS: readonly TargetDomain[] = [
  'FORWARDING',
  'CUSTOMS',
  'TRUCKING',
  'WAREHOUSE',
];

// ============================================================================
// DOMAIN REFERENCE (Loose polymorphic pointer)
// ============================================================================

export interface AssignedDomainReference {
  referenceType: 'SHIPMENT' | 'DECLARATION' | 'SERVICE_REQUEST' | 'WAREHOUSE_ORDER';
  referenceId: string;
  referenceNumber?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// OPERATIONAL HANDOFF ENTITY
// ============================================================================

export interface OperationalHandoff {
  id: string;
  tenantId: string;
  handoffNumber: string;
  fulfillmentId: string;
  fulfillmentAllocationId: string;
  targetDomain: TargetDomain;
  status: OperationalHandoffStatus;
  idempotencyKey: string | null;
  requestPayload: Record<string, unknown>;
  assignedDomainReference: AssignedDomainReference | null;
  failureCode: string | null;
  failureReason: string | null;
  attemptCount: number;
  issuedAt: string;
  acknowledgedAt: string | null;
  acceptedAt: string | null;
  executingAt: string | null;
  fulfilledAt: string | null;
  failedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateOperationalHandoffInput {
  fulfillmentId: string;
  fulfillmentAllocationId: string;
  targetDomain: TargetDomain;
  idempotencyKey?: string | null;
  requestPayload?: Record<string, unknown>;
}

export type OperationalHandoffAction =
  | 'acknowledge'
  | 'accept'
  | 'startExecuting'
  | 'fulfill'
  | 'fail'
  | 'reject'
  | 'cancel';

export interface OperationalHandoffActionInput {
  action: OperationalHandoffAction;
  assignedDomainReference?: AssignedDomainReference;
  failureCode?: string;
  failureReason?: string;
  deliveredQuantity?: number;
}

export interface CreateOperationalHandoffResult {
  handoff: OperationalHandoff;
  created: boolean;
}

// ============================================================================
// ERROR HIERARCHY
// ============================================================================

export type OperationalHandoffErrorCode =
  | 'HANDOFF_NOT_FOUND'
  | 'FULFILLMENT_NOT_FOUND'
  | 'ALLOCATION_NOT_FOUND'
  | 'CROSS_TENANT_REFERENCE'
  | 'INVALID_TARGET_DOMAIN'
  | 'INVALID_STATUS_TRANSITION'
  | 'HANDOFF_TERMINAL'
  | 'UNAUTHORIZED'
  | 'IDEMPOTENCY_CONFLICT'
   | 'ADAPTER_REJECTED'
  | 'DATABASE_ERROR'
  | 'MISSING_IMPORTER_ENTITY'
  | 'SHIPMENT_ATTACHMENT_FAILED';

export class OperationalHandoffError extends Error {
  constructor(
    public readonly code: OperationalHandoffErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OperationalHandoffError';
  }
}
