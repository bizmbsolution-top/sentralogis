/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/warehouse.ts
 *
 * Warehouse SBU Handoff Adapter (ADR-055).
 *
 * Translates Warehouse allocations into svc_service_requests(target_domain='WAREHOUSE').
 * Warehouse domain remains sovereign over receipts, putaway, picking, and inventory.
 */

import { OperationalHandoffAdapter, ValidationResult } from './types';
import { TargetDomain, OperationalHandoff, AssignedDomainReference } from '../types';

export class WarehouseHandoffAdapter implements OperationalHandoffAdapter {
  readonly targetDomain: TargetDomain = 'WAREHOUSE';

  canHandle(domain: TargetDomain): boolean {
    return domain === 'WAREHOUSE';
  }

  async validate(handoff: OperationalHandoff): Promise<ValidationResult> {
    if (handoff.targetDomain !== 'WAREHOUSE') {
      return { valid: false, error: 'Adapter cannot handle non-WAREHOUSE target' };
    }
    return { valid: true };
  }

  createDomainReference(handoff: OperationalHandoff): AssignedDomainReference {
    const serviceRequestId = (handoff.requestPayload?.serviceRequestId as string) || handoff.id;
    const requestNumber = (handoff.requestPayload?.requestNumber as string) || `WH-SR-PENDING-${handoff.handoffNumber}`;
    return {
      referenceType: 'WAREHOUSE_ORDER',
      referenceId: serviceRequestId,
      referenceNumber: requestNumber,
    };
  }
}
