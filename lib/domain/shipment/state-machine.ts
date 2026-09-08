/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/domain/shipment/state-machine.ts
 * Description: Canonical Shipment Lifecycle State Machine
 */

import { ShipmentGlobalStatus } from './types';
import { InvalidShipmentStatusError } from './errors';

export class ShipmentStateMachine {
  private static readonly TRANSITION_GRAPH: Record<ShipmentGlobalStatus, ShipmentGlobalStatus[]> = {
    DRAFT: ['PLANNED', 'CANCELLED'],
    PLANNED: ['BOOKED', 'IN_TRANSIT', 'CANCELLED'],
    BOOKED: ['IN_TRANSIT', 'EXCEPTION_HOLD', 'CANCELLED'],
    IN_TRANSIT: [
      'AT_INTERMEDIATE_NODE',
      'CUSTOMS_HOLD',
      'CUSTOMS_RELEASED',
      'OUT_FOR_DELIVERY',
      'EXCEPTION_HOLD'
    ],
    AT_INTERMEDIATE_NODE: [
      'IN_TRANSIT',
      'CUSTOMS_HOLD',
      'CUSTOMS_RELEASED',
      'OUT_FOR_DELIVERY',
      'EXCEPTION_HOLD'
    ],
    CUSTOMS_HOLD: ['CUSTOMS_RELEASED', 'EXCEPTION_HOLD'],
    CUSTOMS_RELEASED: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'EXCEPTION_HOLD'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'EXCEPTION_HOLD'],
    DELIVERED: ['COMPLETED', 'EXCEPTION_HOLD'],
    EXCEPTION_HOLD: [
      'PLANNED',
      'BOOKED',
      'IN_TRANSIT',
      'AT_INTERMEDIATE_NODE',
      'CUSTOMS_HOLD',
      'CUSTOMS_RELEASED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ],
    COMPLETED: [], // Terminal State
    CANCELLED: []  // Terminal State
  };

  /**
   * Returns true if transition from currentStatus to targetStatus is valid
   */
  public static canTransition(
    currentStatus: ShipmentGlobalStatus,
    targetStatus: ShipmentGlobalStatus
  ): boolean {
    if (currentStatus === targetStatus) return true;
    const allowed = this.TRANSITION_GRAPH[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Throws InvalidShipmentStatusError if transition is invalid
   */
  public static assertTransition(
    currentStatus: ShipmentGlobalStatus,
    targetStatus: ShipmentGlobalStatus
  ): void {
    if (currentStatus === targetStatus) return;
    const allowed = this.TRANSITION_GRAPH[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new InvalidShipmentStatusError(currentStatus, targetStatus, allowed);
    }
  }

  /**
   * Returns allowed next statuses for a given status
   */
  public static getAllowedNextStatuses(status: ShipmentGlobalStatus): ShipmentGlobalStatus[] {
    return this.TRANSITION_GRAPH[status] || [];
  }
}
