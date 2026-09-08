/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/forwarding.ts
 *
 * Forwarding SBU Handoff Adapter (ADR-052).
 *
 * Translates Forwarding allocations to shp_shipments / shp_execution_legs.
 * Forwarding domain remains sovereign over POL, POD, MBL, HBL, vessels, voyages.
 */

import { OperationalHandoffAdapter, ValidationResult } from './types';
import { TargetDomain, OperationalHandoff, AssignedDomainReference } from '../types';

export class ForwardingHandoffAdapter implements OperationalHandoffAdapter {
  readonly targetDomain: TargetDomain = 'FORWARDING';

  canHandle(domain: TargetDomain): boolean {
    return domain === 'FORWARDING';
  }

  async validate(handoff: OperationalHandoff): Promise<ValidationResult> {
    if (handoff.targetDomain !== 'FORWARDING') {
      return { valid: false, error: 'Adapter cannot handle non-FORWARDING target' };
    }
    return { valid: true };
  }

  createDomainReference(handoff: OperationalHandoff): AssignedDomainReference {
    const shipmentId = (handoff.requestPayload?.shipmentId as string) || handoff.id;
    const shipmentNumber = (handoff.requestPayload?.shipmentNumber as string) || `SHP-PENDING-${handoff.handoffNumber}`;
    return {
      referenceType: 'SHIPMENT',
      referenceId: shipmentId,
      referenceNumber: shipmentNumber,
    };
  }
}
