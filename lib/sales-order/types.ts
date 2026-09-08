/**
 * Sentralogis — Phase 4B / U-13
 * lib/sales-order/types.ts
 *
 * Canonical Sales Order types (ADR-034 .. ADR-038).
 *
 * Security invariant (mirrors U-01/U-03): the input DTO contains NO tenantId
 * and NO userId. Both come EXCLUSIVELY from the trusted IdentityContext at
 * call time — never from the client payload.
 *
 * The Sales Order PK (id) is a database-generated UUID; it is NOT the business
 * identity. The business identity is `so_number`, allocated ONLY by the
 * canonical `next_sales_order()` (ADR-035). Client code MUST NOT generate
 * canonical Sales Order numbers.
 */

// ============================================================================
// SALES ORDER STATUS (mirrors com_sales_order_status enum)
// ============================================================================

/** Lifecycle status of a canonical Sales Order. */
export type SalesOrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_FULFILLMENT'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'CLOSED'
  | 'CANCELLED';

/** Statuses that allow a draft update. */
export const EDITABLE_SO_STATUSES: readonly SalesOrderStatus[] = ['DRAFT'];

/** Statuses reachable only forward along the lifecycle. */
export const SO_ACTIVE_STATUSES: readonly SalesOrderStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'IN_FULFILLMENT',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
];

// ============================================================================
// SALES ORDER ENTITY (projected from sales_orders)
// ============================================================================

/**
 * Canonical Sales Order entity.
 * Maps 1:1 to sales_orders but uses application-layer naming.
 */
export interface SalesOrder {
  /** DB-generated canonical identity — NOT the business number. */
  id: string;
  tenantId: string;
  /** Parent Engagement (ADR-034): 1:N. */
  engagementId: string;
  /** Optional originating Quote (direct SO is valid). */
  quoteId: string | null;
  /** Canonical business number, allocated by next_sales_order() (ADR-035). */
  soNumber: string;
  status: SalesOrderStatus;
  orderDate: string;
  targetFulfillmentDate: string | null;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  incoterm: string | null;
  commercialNotes: string | null;
  versionNo: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

// ============================================================================
// CREATE / UPDATE INPUT
// ============================================================================

/**
 * Input for creating a Sales Order.
 *
 * SECURITY: intentionally contains NO tenantId and NO userId — both derive from
 * IdentityContext (U-01). `engagementId` and `quoteId` are validated against
 * tenant ownership before write; cross-tenant references are rejected.
 *
 * `soNumber` is NOT supplied by the client — it is allocated server-side via
 * `next_sales_order()`. `idempotencyKey` (optional, client-supplied UUID)
 * enables safe retry of a create under network/HIMTs retries — it is NOT the
 * business number and NOT the PK.
 */
export interface CreateSalesOrderInput {
  /** Parent Engagement id (ADR-034) — MUST be tenant-owned. */
  engagementId: string;
  /** Optional originating Quote id (direct SO is valid) — MUST be tenant-owned. */
  quoteId?: string | null;
  /** Optional explicit idempotency key (UUID) for retry-safe creation. */
  idempotencyKey?: string | null;
  orderDate?: string;
  targetFulfillmentDate?: string | null;
  currency?: string;
  totalAgreedRevenue?: number;
  paymentTermsDays?: number;
  incoterm?: string | null;
  commercialNotes?: string | null;
  /** ADR-082: optional canonical pricing line items for direct SO creation. */
  lineItems?: import('./line-types').ResolvePricingLineDefinition[];
}

/** Fields editable while a Sales Order remains in DRAFT. */
export interface UpdateSalesOrderInput {
  targetFulfillmentDate?: string | null;
  currency?: string;
  totalAgreedRevenue?: number;
  paymentTermsDays?: number;
  incoterm?: string | null;
  commercialNotes?: string | null;
}

// ============================================================================
// RESULT
// ============================================================================

export interface CreateSalesOrderResult {
  /** The canonical Sales Order. */
  salesOrder: SalesOrder;
  /** true if newly created; false if an idempotent retry resolved the existing row. */
  created: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type SalesOrderErrorCode =
  | 'CUSTOMER_NOT_FOUND'
  | 'ENGAGEMENT_NOT_FOUND'
  | 'ENGAGEMENT_NOT_OWNED'
  | 'SALES_ORDER_NOT_FOUND'
  | 'QUOTE_NOT_FOUND'
  | 'QUOTE_NOT_OWNED'
  | 'QUOTE_NOT_ACCEPTED'
  | 'QUOTE_NO_ITEMS'
  | 'INVALID_STATUS_TRANSITION'
  | 'NOT_EDITABLE'
  | 'UNIQUE_VIOLATION'
  | 'FORBIDDEN_WO_SHARING'
  | 'DATABASE_ERROR';

export class SalesOrderError extends Error {
  constructor(
    public readonly code: SalesOrderErrorCode,
    public readonly statusCode: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
    this.name = 'SalesOrderError';
  }
}
