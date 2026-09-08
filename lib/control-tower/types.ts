/**
 * Sentralogis — Phase 4B / U-23
 * lib/control-tower/types.ts
 *
 * Canonical Control Tower & Commercial Execution Workspace Types.
 *
 * Architectural Invariant:
 * - Read-only projection model: Composes views over canonical domain objects.
 * - Zero duplicated operational state.
 * - Zero second business engine.
 * - Zero client-side number generation.
 * - Strict separation between Internal Operator View and Customer View.
 */

import type { SalesOrder } from '@/lib/sales-order/types';
import type { Fulfillment, FulfillmentAllocation, FulfillmentComposition } from '@/lib/fulfillment/types';
import type { OperationalHandoff, OperationalHandoffStatus, TargetDomain, AssignedDomainReference } from '@/lib/operational-handoff/types';

// ============================================================================
// AGGREGATE DISPLAY STATUS (Projection Label, NOT Authoritative Domain State)
// ============================================================================

export type ControlTowerStatus =
  | 'COMMERCIAL'
  | 'PLANNING'
  | 'HANDOFF_PENDING'
  | 'EXECUTING'
  | 'PARTIALLY_FULFILLED'
  | 'AT_RISK'
  | 'BLOCKED'
  | 'FULFILLED'
  | 'CLOSED';

// ============================================================================
// PROGRESS METRICS
// ============================================================================

export interface WorkspaceProgressMetrics {
  committedRevenue: number;
  currency: string;
  totalPlannedQuantity: number;
  totalDeliveredQuantity: number;
  totalRemainingQuantity: number;
  completionPercentage: number;
}

// ============================================================================
// WORKSPACE ALLOCATION NODE
// ============================================================================

export interface WorkspaceHandoffSummary {
  handoffId: string;
  handoffNumber: string;
  targetDomain: TargetDomain;
  status: OperationalHandoffStatus;
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
}

export interface WorkspaceAllocationNode {
  allocationId: string;
  capabilityType: TargetDomain;
  capabilityBindingId: string | null;
  shipmentId: string | null;
  allocatedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
  status: string;
  handoffs: WorkspaceHandoffSummary[];
}

// ============================================================================
// ACTIONABLE EXCEPTIONS
// ============================================================================

export type ExceptionSeverity = 'WARNING' | 'CRITICAL' | 'BLOCKING';

export type ExceptionCategory =
  | 'HANDOFF_REJECTED'
  | 'OPERATIONAL_FAILURE'
  | 'DELIVERY_STALLED'
  | 'REPLAN_REQUIRED';

export interface WorkspaceException {
  exceptionId: string;
  severity: ExceptionSeverity;
  category: ExceptionCategory;
  affectedDomain: TargetDomain;
  affectedHandoffId: string;
  failureCode: string | null;
  message: string;
  recommendedAction: string;
  occurredAt: string;
}

// ============================================================================
// INTERNAL OPERATOR WORKSPACE (Complete Context)
// ============================================================================

export interface InternalOperatorWorkspace {
  tenantId: string;
  salesOrder: SalesOrder;
  activeFulfillment: FulfillmentComposition | null;
  revisions: Fulfillment[];
  aggregateStatus: ControlTowerStatus;
  progress: WorkspaceProgressMetrics;
  allocations: WorkspaceAllocationNode[];
  exceptions: WorkspaceException[];
  availableCommands: string[];
}

// ============================================================================
// CUSTOMER WORKSPACE PROJECTION (Sanitized / No PII / No Internal Margins)
// ============================================================================

export interface CustomerDeliveryMilestone {
  title: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  completedAt: string | null;
}

export interface CustomerDeliveryProgress {
  capability: string;
  deliveredQuantity: number;
  totalQuantity: number;
  unit: string;
  status: string;
}

export interface CustomerWorkspaceProjection {
  orderNumber: string;
  orderDate: string;
  targetFulfillmentDate: string | null;
  aggregateStatus: ControlTowerStatus;
  overallProgressPercentage: number;
  deliveries: CustomerDeliveryProgress[];
  milestones: CustomerDeliveryMilestone[];
  customerNotice: string | null;
}
