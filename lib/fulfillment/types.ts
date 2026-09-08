/**
 * Sentralogis — Phase 4B / U-15
 * lib/fulfillment/types.ts
 *
 * Canonical Fulfillment types (ADR-039 .. ADR-044).
 *
 * Security invariant (mirrors U-01/U-13): the input DTO contains NO tenantId
 * and NO userId. Both come EXCLUSIVELY from the trusted IdentityContext at
 * call time — never from the client payload.
 *
 * The Fulfillment PK (id) is a database-generated UUID; it is NOT the business
 * identity. The business identity is `fulfillment_number`, allocated ONLY by the
 * canonical `next_fulfillment_number()` (ADR-041). Client code MUST NOT generate
 * canonical Fulfillment numbers.
 */

// ============================================================================
// FULFILLMENT STATUS (mirrors com_fulfillment_status enum)
// ============================================================================

/** Lifecycle status of a canonical Fulfillment composition. */
export type FulfillmentStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CLOSED'
  | 'CANCELLED';

/** Statuses that allow a draft/plan update. */
export const EDITABLE_FULFILLMENT_STATUSES: readonly FulfillmentStatus[] = ['PLANNED'];

/** Active statuses (non-terminal). */
export const FULFILLMENT_ACTIVE_STATUSES: readonly FulfillmentStatus[] = [
  'PLANNED',
  'ACTIVE',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
];

/** Terminal statuses. */
export const FULFILLMENT_TERMINAL_STATUSES: readonly FulfillmentStatus[] = [
  'CLOSED',
  'CANCELLED',
];

/** Valid state transitions (ADR-043). */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  PLANNED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'],
  FULFILLED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

// ============================================================================
// CAPABILITY TYPE (matches commercial_capability_registry.capability_code)
// ============================================================================

export type CapabilityType =
  | 'FORWARDING'
  | 'CUSTOMS'
  | 'TRUCKING'
  | 'WAREHOUSE';

// ============================================================================
// FULFILLMENT ALLOCATION STATUS
// ============================================================================

export type AllocationStatus =
  | 'PLANNED'
  | 'ACTIVE'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'CANCELLED';

// ============================================================================
// FULFILLMENT ENTITY (projected from fulfillments)
// ============================================================================

/**
 * Canonical Fulfillment entity.
 * Maps 1:1 to fulfillments but uses application-layer naming.
 */
export interface Fulfillment {
  /** DB-generated canonical identity — NOT the business number. */
  id: string;
  tenantId: string;
  /** Parent Sales Order (ADR-042): 1:N revisions. */
  salesOrderId: string;
  /** Canonical business number, allocated by next_fulfillment_number() (ADR-041). */
  fulfillmentNumber: string;
  /** Revision number (ADR-042/043). Increments on each plan change. */
  revisionNo: number;
  status: FulfillmentStatus;
  idempotencyKey: string | null;
  targetFulfillmentDate: string | null;
  versionNo: number;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Fulfillment with its capability allocations (composition view).
 */
export interface FulfillmentComposition {
  fulfillment: Fulfillment;
  allocations: FulfillmentAllocation[];
}

// ============================================================================
// FULFILLMENT ALLOCATION ENTITY
// ============================================================================

export interface FulfillmentAllocation {
  id: string;
  tenantId: string;
  fulfillmentId: string;
  capabilityType: CapabilityType;
  capabilityBindingId: string | null;
  allocatedQuantity: number;
  deliveredQuantity: number;
  status: AllocationStatus;
  shipmentId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CREATE / UPDATE INPUT
// ============================================================================

/**
 * Input for creating a Fulfillment composition.
 *
 * SECURITY: intentionally contains NO tenantId and NO userId — both derive from
 * IdentityContext (U-01). `salesOrderId` is validated against tenant ownership
 * before write; cross-tenant references are rejected.
 *
 * `fulfillmentNumber` is NOT supplied by the client — it is allocated server-side via
 * `next_fulfillment_number()`. `idempotencyKey` (optional, client-supplied UUID)
 * enables safe retry of a create under network/HIMTs retries — it is NOT the
 * business number and NOT the PK.
 */
export interface CreateFulfillmentInput {
  /** Parent Sales Order id (ADR-042) — MUST be tenant-owned and CONFIRMED. */
  salesOrderId: string;
  /** Optional explicit idempotency key (UUID) for retry-safe creation. */
  idempotencyKey?: string | null;
  targetFulfillmentDate?: string | null;
  /** Initial capability allocations (optional at create, added later). */
  allocations?: CreateFulfillmentAllocationInput[];
}

/**
 * Input for creating a capability allocation within a Fulfillment.
 */
export interface CreateFulfillmentAllocationInput {
  /** Capability type from registry (ADR-020/042). */
  capabilityType: CapabilityType;
  /** Optional reference to engagement-level capability binding (ADR-020). */
  capabilityBindingId?: string | null;
  /** Quantity allocated to this capability for this fulfillment. */
  allocatedQuantity: number;
  /** Optional shipment reference (FORWARDING allocations). */
  shipmentId?: string | null;
}

/**
 * Input for updating a Fulfillment (PLANNED only).
 */
export interface UpdateFulfillmentInput {
  targetFulfillmentDate?: string | null;
}

/**
 * Input for adding an allocation to an existing Fulfillment (PLANNED only).
 */
export interface AddFulfillmentAllocationInput {
  capabilityType: CapabilityType;
  capabilityBindingId?: string | null;
  allocatedQuantity: number;
  shipmentId?: string | null;
}

/**
 * Input for updating allocation progress (operational event-driven).
 */
export interface UpdateAllocationProgressInput {
  deliveredQuantity: number;
  status?: AllocationStatus;
  shipmentId?: string | null;
}

// ============================================================================
// LIFECYCLE ACTION INPUTS
// ============================================================================

export type FulfillmentAction =
  | 'activate'    // PLANNED -> ACTIVE (ADR-036 handoff begins)
  | 'cancel'      // PLANNED/ACTIVE -> CANCELLED
  | 'void';       // PLANNED -> CANCELLED (alias for cancel before activation)

export interface FulfillmentActionInput {
  action: FulfillmentAction;
  reason?: string;
}

// ============================================================================
// RESULT
// ============================================================================

export interface CreateFulfillmentResult {
  /** The canonical Fulfillment. */
  fulfillment: Fulfillment;
  /** true if newly created; false if an idempotent retry resolved the existing row. */
  created: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type FulfillmentErrorCode =
  | 'SALES_ORDER_NOT_FOUND'
  | 'SALES_ORDER_NOT_OWNED'
  | 'SALES_ORDER_NOT_CONFIRMED'
  | 'FULFILLMENT_NOT_FOUND'
  | 'FULFILLMENT_ALLOCATION_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'NOT_EDITABLE'
  | 'NOT_IN_PLANNED_STATE'
  | 'UNIQUE_VIOLATION'
  | 'INVALID_CAPABILITY_TYPE'
  | 'CAPABILITY_BINDING_NOT_FOUND'
  | 'SHIPMENT_NOT_FOUND'
  | 'SHIPMENT_NOT_OWNED'
  | 'DATABASE_ERROR';

export class FulfillmentError extends Error {
  constructor(
    public readonly code: FulfillmentErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'FulfillmentError';
  }
}