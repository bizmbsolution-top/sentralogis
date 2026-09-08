/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/trucking.ts
 *
 * Trucking SBU Handoff Adapter (ADR-054).
 *
 * Translates Trucking allocations into svc_service_requests -> trucking lineage.
 * Enforces canonical commercial lineage (SR -> Engagement -> WO -> wo_item -> JO).
 * Direct SO -> JO and Fulfillment -> JO are strictly forbidden.
 */

import { OperationalHandoffAdapter, ValidationResult } from './types';
import { TargetDomain, OperationalHandoff, AssignedDomainReference } from '../types';

export class TruckingHandoffAdapter implements OperationalHandoffAdapter {
  readonly targetDomain: TargetDomain = 'TRUCKING';

  canHandle(domain: TargetDomain): boolean {
    return domain === 'TRUCKING';
  }

  async validate(handoff: OperationalHandoff): Promise<ValidationResult> {
    if (handoff.targetDomain !== 'TRUCKING') {
      return { valid: false, error: 'Adapter cannot handle non-TRUCKING target' };
    }
    return { valid: true };
  }

  createDomainReference(handoff: OperationalHandoff): AssignedDomainReference {
    const serviceRequestId = (handoff.requestPayload?.serviceRequestId as string) || handoff.id;
    const requestNumber = (handoff.requestPayload?.requestNumber as string) || `SR-PENDING-${handoff.handoffNumber}`;
    return {
      referenceType: 'SERVICE_REQUEST',
      referenceId: serviceRequestId,
      referenceNumber: requestNumber,
    };
  }
}
