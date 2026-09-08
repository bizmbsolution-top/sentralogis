/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/types.ts
 *
 * Application-layer contracts for the Commercial Work Order API.
 *
 * ARCHITECTURAL NOTE (ADR-018/ADR-032): the canonical engagement root IS
 * `commercial_work_orders`. A "commercial work order" and an "engagement"
 * are the same canonical record observed at different layers. U-04 exposes
 * that record through an application boundary; it creates NO other table.
 */

import type { EngagementStatus } from '@/lib/application/engagement/types';

// ============================================================================
// COMMAND DTO (POST)
// ============================================================================

/**
 * Client command for POST /api/v1/commercial/work-orders.
 *
 * SECURITY: deliberately contains NO tenant_id, NO created_by, NO status,
 * NO wo_number, NO revenue fields. Tenant/user come from IdentityContext;
 * server-generated fields are application-owned.
 *
 * Protected fields sent by a client are REJECTED with 400 (validation.ts).
 */
export interface CreateWorkOrderCommand {
  /** Business party — must be owned by the caller's tenant. */
  customerId: string;
  /** Optional explicit engagement reference (tenant-scoped, consistency-checked). */
  engagementId?: string;
  contractReference?: string;
  targetFulfillmentDate?: string;
  currency?: string;
  commercialNotes?: string;
}

/** Fields a client may never supply. Presence of any key → 400. */
export const PROTECTED_COMMAND_FIELDS: readonly string[] = [
  'id',
  'tenant_id',
  'tenantId',
  'created_by',
  'createdBy',
  'updated_by',
  'updatedBy',
  'wo_number',
  'woNumber',
  'status',
  'total_agreed_revenue',
  'totalAgreedRevenue',
  'payment_terms_days',
  'paymentTermsDays',
  'version_no',
  'versionNo',
  'service_scope_id',
  'serviceScopeId',
  'order_date',
  'orderDate',
];

// ============================================================================
// LIST FILTERS (GET)
// ============================================================================

export interface ListWorkOrdersFilters {
  customerId?: string;
  statuses?: EngagementStatus[];
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================================================
// API VIEW
// ============================================================================

/** Application representation returned to API consumers (no raw SELECT *). */
export interface WorkOrderView {
  id: string;
  woNumber: string;
  customerId: string;
  status: EngagementStatus;
  orderDate: string;
  targetFulfillmentDate: string | null;
  currency: string;
  contractReference: string | null;
  createdAt: string;
}

// ============================================================================
// SERVICE RESULTS
// ============================================================================

export interface CreateWorkOrderResult {
  workOrder: WorkOrderView;
  /** true = newly created (HTTP 201); false = resolved existing open WO (200). */
  created: boolean;
}

export interface ListWorkOrdersResult {
  data: WorkOrderView[];
  meta: { limit: number; offset: number; total: number };
}

// ============================================================================
// ERRORS
// ============================================================================

export type WorkOrderErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'ENGAGEMENT_CUSTOMER_MISMATCH'
  | 'ENGAGEMENT_REFERENCE_CONFLICT';

export class WorkOrderError extends Error {
  constructor(
    public readonly code: WorkOrderErrorCode,
    public readonly statusCode: 400 | 404 | 409,
    message: string,
    public readonly details?: string[],
  ) {
    super(message);
    this.name = 'WorkOrderError';
  }
}
