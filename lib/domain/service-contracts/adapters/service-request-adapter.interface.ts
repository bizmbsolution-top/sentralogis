/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/adapters/service-request-adapter.interface.ts
 * Description: Pluggable Adapter Contract for SBU Capability Execution
 */

import { ServiceRequest, ServiceTargetDomain } from '../types';
import { ValidationResult } from '../service-request-validator';

export interface AdapterExecutionResult {
  success: boolean;
  domainJobId: string;
  domainJobNumber?: string;
  metadata?: Record<string, unknown>;
}

export interface AdapterCompensationContext {
  serviceRequestId: string;
  domainJobId?: string;
  tenantId: string;
  reason: string;
}

export interface ServiceRequestAdapter {
  readonly targetDomain: ServiceTargetDomain;

  /**
   * Returns true if this adapter can fulfill the requested service SKU
   */
  supports(serviceProductSku: string): boolean;

  /**
   * Validates target SBU readiness & resource availability
   */
  validate(request: ServiceRequest): Promise<ValidationResult>;

  /**
   * Executes domain job creation in the target SBU's private tables
   */
  execute(request: ServiceRequest): Promise<AdapterExecutionResult>;

  /**
   * Compensates (cleans up/cancels) the domain job if the orchestrator fails downstream
   */
  compensate?(context: AdapterCompensationContext): Promise<void>;
}
