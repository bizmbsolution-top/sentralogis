/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/types.ts
 *
 * Domain Adapter Interface (ADR-051 .. ADR-055).
 * Adapters are TRANSLATION BOUNDARIES, not duplicate operational engines.
 */

import { TargetDomain, OperationalHandoff, AssignedDomainReference } from '../types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface OperationalHandoffAdapter {
  readonly targetDomain: TargetDomain;
  canHandle(domain: TargetDomain): boolean;
  validate(handoff: OperationalHandoff): Promise<ValidationResult>;
  createDomainReference(handoff: OperationalHandoff): AssignedDomainReference;
}
