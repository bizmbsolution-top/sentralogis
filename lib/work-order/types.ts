/**
 * Sentralogis — Phase 3 / Unit 1
 * lib/work-order/types.ts
 *
 * Canonical Work Order read types (ADR-088, Phase 2 handoff Candidate 1).
 *
 * READ-ONLY: These types describe the read projection surface for the
 * canonical WO/JO execution workspace. No mutation DTOs are defined here.
 *
 * Security invariant: Tenant identity is derived EXCLUSIVELY from the
 * trusted IdentityContext (U-01). No client-supplied tenant_id is accepted.
 */

// ============================================================================
// WORK ORDER (legacy table: work_orders)
// ============================================================================

export type WorkOrderStatus =
  | 'draft'
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'incident'
  | 'waiting_armada';

export interface WorkOrder {
  id: string;
  tenantId: string;
  woNumber: string;
  customerId: string | null;
  customerName: string | null;
  status: WorkOrderStatus;
  orderDate: string | null;
  executionDate: string | null;
  executionTime: string | null;
  targetFulfillmentDate: string | null;
  notes: string | null;
  transporterId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  assignedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface WorkOrderView {
  id: string;
  woNumber: string;
  status: WorkOrderStatus;
  customerName: string | null;
  orderDate: string | null;
  executionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WORK ORDER ITEMS (legacy table: wo_items)
// ============================================================================

export type WoItemType =
  | 'FORWARDING'
  | 'CUSTOMS'
  | 'TRUCKING'
  | 'WAREHOUSE';

export interface WorkOrderItem {
  id: string;
  tenantId: string;
  woId: string;
  itemCode: string | null;
  sbuType: WoItemType;
  status: string;
  maxJoCount: number | null;
  unitPrice: number | null;
  totalRevenue: number | null;
  itemData: Record<string, unknown> | null;
  sbuMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// JOB ORDER (legacy table: job_orders)
// ============================================================================

export type JobOrderStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'picking_up'
  | 'delivering'
  | 'delivered'
  | 'cancelled'
  | 'incident'
  | 'waiting_armada';

export interface JobOrder {
  id: string;
  tenantId: string;
  woItemId: string;
  woId: string;
  joNumber: string;
  status: JobOrderStatus;
  transporterId: string | null;
  transporterName: string | null;
  fleetId: string | null;
  fleetPlateNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  containerNumber: string | null;
  basePrice: number | null;
  purchasePrice: number | null;
  vendorPrice: number | null;
  notes: string | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sbuType?: string | null;
  customerName?: string | null;
  woNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
}

// ============================================================================
// WORK ORDER EXECUTION VIEW (composed read projection)
// ============================================================================

export interface WorkOrderExecutionView {
  workOrder: WorkOrderView;
  items: WorkOrderItemView[];
}

export interface WorkOrderItemView {
  id: string;
  itemCode: string | null;
  sbuType: WoItemType;
  status: string;
  jobOrders: JobOrderView[];
}

export interface JobOrderView {
  id: string;
  joNumber: string;
  status: JobOrderStatus;
  transporterName: string | null;
  fleetPlateNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  containerNumber: string | null;
  basePrice: number | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// ============================================================================
// ERRORS
// ============================================================================

export type WorkOrderReadErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

export class WorkOrderReadError extends Error {
  constructor(
    public readonly code: WorkOrderReadErrorCode,
    public readonly statusCode: 400 | 401 | 403 | 404,
    message: string,
  ) {
    super(message);
    this.name = 'WorkOrderReadError';
  }
}
