/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/customs.ts
 *
 * Customs SBU Handoff Adapter (ADR-053).
 *
 * Translates Customs allocations to cus_declarations / CustomsAttachmentService.
 * Customs domain remains sovereign over CEISA, statutory valuation, Lartas,
 * and SHA-256 audit continuity.
 */

import { OperationalHandoffAdapter, ValidationResult } from './types';
import { TargetDomain, OperationalHandoff, AssignedDomainReference } from '../types';

export class CustomsHandoffAdapter implements OperationalHandoffAdapter {
  readonly targetDomain: TargetDomain = 'CUSTOMS';

  canHandle(domain: TargetDomain): boolean {
    return domain === 'CUSTOMS';
  }

  async validate(handoff: OperationalHandoff): Promise<ValidationResult> {
    if (handoff.targetDomain !== 'CUSTOMS') {
      return { valid: false, error: 'Adapter cannot handle non-CUSTOMS target' };
    }
    return { valid: true };
  }

  createDomainReference(handoff: OperationalHandoff): AssignedDomainReference {
    const declarationId = (handoff.requestPayload?.declarationId as string) || handoff.id;
    const ajuNumber = (handoff.requestPayload?.ajuNumber as string) || `AJU-PENDING-${handoff.handoffNumber}`;
    return {
      referenceType: 'DECLARATION',
      referenceId: declarationId,
      referenceNumber: ajuNumber,
    };
  }
}
