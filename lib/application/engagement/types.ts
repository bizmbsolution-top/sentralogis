/**
 * Sentralogis — Phase 4B-1b / U-03
 * lib/application/engagement/types.ts
 *
 * Canonical engagement types for the Resolve-or-Create Bridge.
 *
 * The canonical engagement IS commercial_work_orders (ADR-018).
 * This module defines the application-layer types that wrap the database
 * representation without leaking raw schema details.
 */

// ============================================================================
// ENGAGEMENT STATUS (mirrors com_work_order_status enum)
// ============================================================================

/** Lifecycle status of a canonical engagement. */
export type EngagementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'IN_EXECUTION'
  | 'FULFILLED'
  | 'BILLED'
  | 'CLOSED'
  | 'CANCELLED';

/** Engagement statuses considered "open" for resolve-or-create. */
export const OPEN_ENGAGEMENT_STATUSES: readonly EngagementStatus[] = ['DRAFT', 'SUBMITTED'];

// ============================================================================
// ENGAGEMENT ENTITY (projected from commercial_work_orders)
// ============================================================================

/**
 * Canonical engagement entity.
 * Maps 1:1 to commercial_work_orders but uses application-layer naming.
 */
export interface Engagement {
  id: string;
  tenantId: string;
  woNumber: string;
  customerId: string;
  serviceScopeId: string | null;
  contractReference: string | null;
  orderDate: string;
  targetFulfillmentDate: string | null;
  status: EngagementStatus;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  commercialNotes: string | null;
  versionNo: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// RESOLVE-OR-CREATE INPUT
// ============================================================================

/**
 * Input for the resolve-or-create operation.
 *
 * SECURITY: this input intentionally contains NO tenantId and NO userId.
 * Both come EXCLUSIVELY from the trusted IdentityContext (U-01) at call time —
 * never from the client payload (mandate §6/§7).
 *
 * `customerId` is the deterministic business key for resolution.
 */
export interface ResolveOrCreateEngagementInput {
  /** Business party (customer entity) — MUST be tenant-owned. */
  customerId: string;
  /** Optional contract reference for creation context. */
  contractReference?: string | null;
  /** Optional target fulfillment date. */
  targetFulfillmentDate?: string | null;
  /** Optional commercial notes. */
  commercialNotes?: string | null;
  /** Optional currency override (default: IDR). */
  currency?: string;
  /** Optional legacy work order ID for bridge mapping. */
  legacyWorkOrderId?: string | null;
}

// ============================================================================
// RESOLVE-OR-CREATE RESULT
// ============================================================================

/**
 * Result of a resolve-or-create engagement operation.
 */
export interface EngagementResult {
  /** The canonical engagement. */
  engagement: Engagement;
  /** Whether the engagement was newly created (true) or resolved (false). */
  created: boolean;
}

// ============================================================================
// BRIDGE MAPPING (legacy_wo_bridge)
// ============================================================================

/**
 * A mapping between a legacy work_orders.id and a canonical engagement.
 */
export interface LegacyWoBridge {
  id: string;
  tenantId: string;
  legacyWoId: string;
  engagementId: string;
  createdAt: string;
  createdBy: string | null;
}

// ============================================================================
// WO NUMBER GENERATION
// ============================================================================

/**
 * Parameters for generating a canonical wo_number.
 */
export interface WoNumberParams {
  tenantCode: string;
  customerCode: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type EngagementErrorCode =
  | 'CUSTOMER_NOT_FOUND'
  | 'CUSTOMER_NOT_OWNED'
  | 'SCOPE_NOT_FOUND'
  | 'UNIQUE_VIOLATION'
  | 'DATABASE_ERROR';

export class EngagementError extends Error {
  constructor(
    public readonly code: EngagementErrorCode,
    public readonly statusCode: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'EngagementError';
  }
}
