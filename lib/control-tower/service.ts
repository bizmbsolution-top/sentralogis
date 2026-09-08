/**
 * Sentralogis — Phase 4B / U-23
 * lib/control-tower/service.ts
 *
 * Canonical Control Tower & Commercial Execution Workspace Query Service.
 *
 * Architectural Invariant:
 * - Read-only projection model: Composes views over canonical domain objects.
 * - Zero duplicated operational state.
 * - Zero second business engine.
 * - Zero database writes.
 * - Zero client-side number generation.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { findSalesOrderById } from '@/lib/sales-order/service';
import {
  listFulfillmentsBySalesOrder,
  findFulfillmentCompositionById,
} from '@/lib/fulfillment/service';
import { listOperationalHandoffsByFulfillment } from '@/lib/operational-handoff/service';
import type { OperationalHandoff } from '@/lib/operational-handoff/types';
import type {
  ControlTowerStatus,
  WorkspaceProgressMetrics,
  WorkspaceHandoffSummary,
  WorkspaceAllocationNode,
  WorkspaceException,
  InternalOperatorWorkspace,
  CustomerWorkspaceProjection,
  CustomerDeliveryMilestone,
} from './types';

// ============================================================================
// AGGREGATE DISPLAY STATUS DERIVATION RULES (Pure Function)
// ============================================================================

export function deriveControlTowerStatus(
  soStatus: string,
  flStatus?: string | null,
  handoffs: OperationalHandoff[] = [],
  allocationsProgress: { totalAllocated: number; totalDelivered: number } = { totalAllocated: 0, totalDelivered: 0 },
): ControlTowerStatus {
  if (soStatus === 'DRAFT' || (soStatus === 'CONFIRMED' && !flStatus)) {
    return 'COMMERCIAL';
  }

  if (soStatus === 'CANCELLED' || flStatus === 'CLOSED') {
    return 'CLOSED';
  }

  if (flStatus === 'PLANNED') {
    return 'PLANNING';
  }

  if (handoffs.length === 0) {
    return 'HANDOFF_PENDING';
  }

  const allHandoffsFailedOrRejected =
    handoffs.length > 0 &&
    handoffs.every((h) => h.status === 'FAILED' || h.status === 'REJECTED');

  if (allHandoffsFailedOrRejected) {
    return 'BLOCKED';
  }

  const hasAnyFailedOrRejected = handoffs.some(
    (h) => h.status === 'FAILED' || h.status === 'REJECTED',
  );

  if (hasAnyFailedOrRejected) {
    return 'AT_RISK';
  }

  if (
    allocationsProgress.totalAllocated > 0 &&
    allocationsProgress.totalDelivered >= allocationsProgress.totalAllocated &&
    handoffs.every((h) => h.status === 'FULFILLED')
  ) {
    return 'FULFILLED';
  }

  if (allocationsProgress.totalDelivered > 0) {
    return 'PARTIALLY_FULFILLED';
  }

  const hasExecutingOrAccepted = handoffs.some(
    (h) => h.status === 'EXECUTING' || h.status === 'ACCEPTED',
  );

  if (hasExecutingOrAccepted) {
    return 'EXECUTING';
  }

  return 'HANDOFF_PENDING';
}

// ============================================================================
// AVAILABLE COMMANDS DERIVATION (Pure Function)
// ============================================================================

export function deriveAvailableCommands(
  soStatus: string,
  flStatus?: string | null,
): string[] {
  const commands: string[] = [];

  if (soStatus === 'DRAFT') {
    commands.push('confirmSalesOrder', 'cancelSalesOrder');
  } else if (soStatus === 'CONFIRMED') {
    if (!flStatus) {
      commands.push('createFulfillment', 'cancelSalesOrder');
    } else if (flStatus === 'PLANNED') {
      commands.push('activateFulfillment', 'cancelFulfillment', 'addFulfillmentAllocation');
    } else if (flStatus === 'ACTIVE' || flStatus === 'PARTIALLY_FULFILLED') {
      commands.push('createOperationalHandoff', 'replanFulfillment', 'cancelFulfillment');
    }
  }

  return commands;
}

// ============================================================================
// INTERNAL OPERATOR WORKSPACE QUERY
// ============================================================================

export async function getInternalOperatorWorkspace(
  context: IdentityContext,
  salesOrderId: string,
): Promise<InternalOperatorWorkspace> {
  assertPermission(context, 'commercial:read');

  // 1. Fetch Sales Order
  const salesOrder = await findSalesOrderById(context, salesOrderId);

  // 2. Fetch All Fulfillment Revisions
  const revisions = await listFulfillmentsBySalesOrder(context, salesOrderId);

  // 3. Identify Active Fulfillment (highest revision or non-cancelled)
  const activeFulfillmentSummary =
    revisions.filter((r) => r.status !== 'CANCELLED').pop() ||
    revisions[revisions.length - 1] ||
    null;

  let activeComposition = null;
  let handoffs: OperationalHandoff[] = [];

  if (activeFulfillmentSummary) {
    activeComposition = await findFulfillmentCompositionById(
      context,
      activeFulfillmentSummary.id,
    );
    handoffs = await listOperationalHandoffsByFulfillment(
      context,
      activeFulfillmentSummary.id,
    );
  }

  // 4. Map Allocations & Handoffs
  let totalPlannedQty = 0;
  let totalDeliveredQty = 0;
  const allocationNodes: WorkspaceAllocationNode[] = [];
  const exceptions: WorkspaceException[] = [];

  if (activeComposition && activeComposition.allocations) {
    for (const alloc of activeComposition.allocations) {
      totalPlannedQty += alloc.allocatedQuantity;
      totalDeliveredQty += alloc.deliveredQuantity;

      const allocHandoffs = handoffs.filter(
        (h) => h.fulfillmentAllocationId === alloc.id,
      );

      const handoffSummaries: WorkspaceHandoffSummary[] = allocHandoffs.map((h) => ({
        handoffId: h.id,
        handoffNumber: h.handoffNumber,
        targetDomain: h.targetDomain,
        status: h.status,
        assignedDomainReference: h.assignedDomainReference,
        failureCode: h.failureCode,
        failureReason: h.failureReason,
        attemptCount: h.attemptCount,
        issuedAt: h.issuedAt,
        acknowledgedAt: h.acknowledgedAt,
        acceptedAt: h.acceptedAt,
        executingAt: h.executingAt,
        fulfilledAt: h.fulfilledAt,
        failedAt: h.failedAt,
        rejectedAt: h.rejectedAt,
        cancelledAt: h.cancelledAt,
      }));

      // Collect exceptions from failed or rejected handoffs
      for (const h of allocHandoffs) {
        if (h.status === 'FAILED') {
          exceptions.push({
            exceptionId: `exc-${h.id}`,
            severity: 'CRITICAL',
            category: 'OPERATIONAL_FAILURE',
            affectedDomain: h.targetDomain,
            affectedHandoffId: h.id,
            failureCode: h.failureCode,
            message: h.failureReason || `Operational failure encountered in ${h.targetDomain}`,
            recommendedAction: 'Inspect domain diagnostics, retry dispatch, or initiate fulfillment replanning.',
            occurredAt: h.failedAt || h.updatedAt,
          });
        } else if (h.status === 'REJECTED') {
          exceptions.push({
            exceptionId: `exc-${h.id}`,
            severity: 'WARNING',
            category: 'HANDOFF_REJECTED',
            affectedDomain: h.targetDomain,
            affectedHandoffId: h.id,
            failureCode: h.failureCode,
            message: h.failureReason || `Handoff rejected by ${h.targetDomain} domain validator`,
            recommendedAction: 'Verify payload references or reassign execution parameters.',
            occurredAt: h.rejectedAt || h.updatedAt,
          });
        }
      }

      allocationNodes.push({
        allocationId: alloc.id,
        capabilityType: alloc.capabilityType,
        capabilityBindingId: alloc.capabilityBindingId,
        shipmentId: alloc.shipmentId,
        allocatedQuantity: alloc.allocatedQuantity,
        deliveredQuantity: alloc.deliveredQuantity,
        remainingQuantity: Math.max(0, alloc.allocatedQuantity - alloc.deliveredQuantity),
        status: alloc.status,
        handoffs: handoffSummaries,
      });
    }
  }

  // 5. Progress Metrics
  const completionPercentage =
    totalPlannedQty > 0
      ? Math.min(100, Math.round((totalDeliveredQty / totalPlannedQty) * 100))
      : 0;

  const progress: WorkspaceProgressMetrics = {
    committedRevenue: salesOrder.totalAgreedRevenue,
    currency: salesOrder.currency,
    totalPlannedQuantity: totalPlannedQty,
    totalDeliveredQuantity: totalDeliveredQty,
    totalRemainingQuantity: Math.max(0, totalPlannedQty - totalDeliveredQty),
    completionPercentage,
  };

  // 6. Aggregate Status Derivation
  const aggregateStatus = deriveControlTowerStatus(
    salesOrder.status,
    activeFulfillmentSummary?.status,
    handoffs,
    { totalAllocated: totalPlannedQty, totalDelivered: totalDeliveredQty },
  );

  // 7. Available Commands
  const availableCommands = deriveAvailableCommands(
    salesOrder.status,
    activeFulfillmentSummary?.status,
  );

  return {
    tenantId: context.tenantId,
    salesOrder,
    activeFulfillment: activeComposition,
    revisions,
    aggregateStatus,
    progress,
    allocations: allocationNodes,
    exceptions,
    availableCommands,
  };
}

// ============================================================================
// CUSTOMER WORKSPACE PROJECTION (Sanitized / No Cost / No PII)
// ============================================================================

export async function getCustomerWorkspaceProjection(
  context: IdentityContext,
  salesOrderId: string,
): Promise<CustomerWorkspaceProjection> {
  const internal = await getInternalOperatorWorkspace(context, salesOrderId);
  const so = internal.salesOrder;

  // Build sanitized delivery progress
  const deliveries = internal.allocations.map((alloc) => ({
    capability: alloc.capabilityType,
    deliveredQuantity: alloc.deliveredQuantity,
    totalQuantity: alloc.allocatedQuantity,
    unit: 'units',
    status: alloc.status,
  }));

  // Build customer milestone journey
  const milestones: CustomerDeliveryMilestone[] = [
    {
      title: 'Order Confirmed',
      status: so.status === 'CONFIRMED' ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: so.confirmedAt,
    },
    {
      title: 'Fulfillment Scheduled',
      status: internal.activeFulfillment ? 'COMPLETED' : 'PENDING',
      completedAt: internal.activeFulfillment?.fulfillment.createdAt || null,
    },
    {
      title: 'Operations In Transit',
      status:
        internal.aggregateStatus === 'EXECUTING' || internal.aggregateStatus === 'PARTIALLY_FULFILLED'
          ? 'IN_PROGRESS'
          : internal.aggregateStatus === 'FULFILLED'
          ? 'COMPLETED'
          : internal.aggregateStatus === 'AT_RISK' || internal.aggregateStatus === 'BLOCKED'
          ? 'DELAYED'
          : 'PENDING',
      completedAt: null,
    },
    {
      title: 'Delivery Completed',
      status: internal.aggregateStatus === 'FULFILLED' ? 'COMPLETED' : 'PENDING',
      completedAt: null,
    },
  ];

  const customerNotice =
    internal.aggregateStatus === 'AT_RISK' || internal.aggregateStatus === 'BLOCKED'
      ? 'Your shipment is experiencing a minor operational delay. Our support team is actively managing resolution.'
      : null;

  return {
    orderNumber: so.soNumber,
    orderDate: so.orderDate,
    targetFulfillmentDate: so.targetFulfillmentDate,
    aggregateStatus: internal.aggregateStatus,
    overallProgressPercentage: internal.progress.completionPercentage,
    deliveries,
    milestones,
    customerNotice,
  };
}
