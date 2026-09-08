/**
 * Sentralogis — AI Copilot Stage 3 EXECUTE
 * lib/copilot/execute/execution-service.ts
 *
 * Canonical execution service for Copilot EXECUTE mode.
 *
 * This service:
 * 1. Validates execution request and confirmation
 * 2. Checks authorization via canonical assertPermission
 * 3. Routes intents to canonical domain services
 * 4. Records execution audit trail
 * 5. Returns execution result
 *
 * It does NOT:
 * - Bypass domain authorization
 * - Skip tenant isolation
 * - Create parallel data authorities
 * - Execute financial/accounting mutations
 * - Invoke ExecutionEngine mock
 *
 * Canonical flow:
 *   Confirmed Proposal
 *   → Execution Request Validation
 *   → Authorization Check
 *   → Canonical Domain Service
 *   → Persistence Authority
 *   → Audit Trail
 *   → Execution Result
 */

import type { ExecutionRequest, ExecutionResult, ExecutionPolicyCheck } from './types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { audit } from '@/lib/audit';
import type { IdentityContext } from '@/lib/application/identity/types';
import { ProposalAuthorityService, type AuthoritativeProposal } from '@/lib/copilot/propose/proposal-authority-service';
import { ActionBridge } from '@/src/platforms/copilot/execution/ActionBridge';
import { JobOrderAssignmentService, JobOrderCancellationService, DriverReplacementService, type AssignDriverInput, type ReplaceDriverInput, type JobOrderResult } from '@/lib/domain/jo/job-order-domain-service';
import { isCopilotActionEnabled, COPILOT_FEATURE_FLAGS } from '@/lib/copilot/feature-flags';

export class ExecutionService {
  /**
   * Execute a confirmed proposal through canonical domain services.
   *
   * @param identity - Server-derived identity context
   * @param request - Execution request with confirmed proposal
   * @returns Execution result
   */
  static async execute(
    identity: IdentityContext,
    request: ExecutionRequest,
  ): Promise<ExecutionResult> {
    const { proposalId, confirmation } = request;

    if (!proposalId) {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: 'UNKNOWN',
        message: 'Execution denied: proposalId is required.',
        affectedEntities: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: proposalId || 'UNKNOWN',
        },
      };
    }

    let authoritativeProposal;
    try {
      authoritativeProposal = await ProposalAuthorityService.getProposal(identity, proposalId);
    } catch (error: any) {
      const message = error?.message || 'Proposal not found or access denied.';
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: 'UNKNOWN',
        message,
        affectedEntities: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId,
        },
      };
    }

    if (!confirmation.confirmed) {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: 'Execution denied: proposal not confirmed.',
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    if (authoritativeProposal.lifecycle_state !== 'CONFIRMED' && authoritativeProposal.lifecycle_state !== 'EXECUTABLE') {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: `Execution denied: invalid proposal lifecycle state ${authoritativeProposal.lifecycle_state}.`,
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    const authoritativePermissions = authoritativeProposal.required_permissions || [];
    const policyCheck = this.checkAuthorization(identity, authoritativePermissions);
    if (!policyCheck.authorized) {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: `Execution denied: missing permissions: ${policyCheck.missingPermissions.join(', ')}`,
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    let executionProposal;
    try {
      executionProposal = await ProposalAuthorityService.claimProposalForExecution(identity, authoritativeProposal.proposal_number);
    } catch (error: any) {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: error?.message || 'Execution denied: proposal not executable.',
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    if (executionProposal.outcome === 'ALREADY_EXECUTED' || executionProposal.lifecycle_state === 'EXECUTED') {
      const existingResult = executionProposal.proposal_payload?.executionResult;
      return {
        executionId: existingResult?.executionId || `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: existingResult?.status === 'SUCCESS' ? 'SUCCESS' : existingResult?.status === 'FAILED' ? 'FAILED' : 'DENIED',
        intent: authoritativeProposal.intent,
        message: existingResult?.message || 'Proposal already executed.',
        affectedEntities: Array.isArray(executionProposal.entities) ? executionProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: existingResult?.executionId || `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    if (executionProposal.outcome === 'CONFLICT') {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: 'Execution denied: another request is currently executing this proposal.',
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    if (executionProposal.outcome === 'INVALID_STATE' || executionProposal.lifecycle_state === 'INVALID_STATE') {
      return {
        executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'DENIED',
        intent: authoritativeProposal.intent,
        message: `Execution denied: invalid proposal lifecycle state ${executionProposal.lifecycle_state}.`,
        affectedEntities: Array.isArray(authoritativeProposal.entities) ? authoritativeProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }

    const startTime = Date.now();

    try {
      const domainResult = await this.routeToDomainService(identity, executionProposal, request.confirmation);

      await ProposalAuthorityService.recordExecutionResult(
        identity,
        authoritativeProposal.proposal_number,
        domainResult.executionId,
        {
          status: 'SUCCESS',
          message: domainResult.message,
          affectedEntities: Array.isArray(executionProposal.entities) ? executionProposal.entities.map((e: any) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            displayName: e.displayName,
          })) : [],
        },
      );

      await this.recordExecutionAudit({
        executionId: domainResult.executionId,
        proposalId: authoritativeProposal.proposal_number,
        intent: authoritativeProposal.intent,
        status: 'SUCCESS',
        message: domainResult.message,
        identity,
        entities: executionProposal.entities,
        confirmation,
      });

      return {
        ...domainResult,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      await ProposalAuthorityService.recordExecutionResult(
        identity,
        authoritativeProposal.proposal_number,
        executionId,
        {
          status: 'FAILED',
          message: error.message || 'Execution failed',
          affectedEntities: Array.isArray(executionProposal.entities) ? executionProposal.entities.map((e: any) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            displayName: e.displayName,
          })) : [],
        },
      );

      await this.recordExecutionAudit({
        executionId,
        proposalId: authoritativeProposal.proposal_number,
        intent: authoritativeProposal.intent,
        status: 'FAILED',
        message: error.message || 'Execution failed',
        identity,
        entities: executionProposal.entities,
        confirmation,
      });

      return {
        executionId,
        status: 'FAILED',
        intent: authoritativeProposal.intent,
        message: error.message || 'Execution failed',
        affectedEntities: Array.isArray(executionProposal.entities) ? executionProposal.entities.map((e: any) => ({
          entityType: e.entityType,
          entityId: e.entityId,
          displayName: e.displayName,
        })) : [],
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        audit: {
          correlationId: `exec-${Date.now()}`,
          actorUserId: identity.userId,
          actorTenantId: identity.tenantId,
          proposalId: authoritativeProposal.proposal_number,
        },
      };
    }
  }

  private static checkAuthorization(
    identity: IdentityContext,
    requiredPermissions: string[],
  ): ExecutionPolicyCheck {
    const missingPermissions: string[] = [];

    for (const permission of requiredPermissions) {
      try {
        assertPermission(identity, permission as any);
      } catch {
        missingPermissions.push(permission);
      }
    }

    return {
      authorized: missingPermissions.length === 0,
      missingPermissions,
    };
  }

  private static async routeToDomainService(
    identity: IdentityContext,
    proposal: AuthoritativeProposal,
    confirmation: ExecutionRequest['confirmation'],
  ): Promise<Omit<ExecutionResult, 'durationMs'>> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    switch (proposal.intent) {
      case 'ASSIGN_DRIVER': {
        if (!isCopilotActionEnabled('ASSIGN_DRIVER')) {
          throw new Error(`Copilot action ASSIGN_DRIVER is not enabled. Set ${COPILOT_FEATURE_FLAGS.ASSIGN_DRIVER.envVar}=true to enable.`);
        }
        const jobOrder = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'JobOrder') : null;
        const driver = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'Driver') : null;
        const vehicle = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'Vehicle') : null;

        if (!jobOrder || !driver) {
          throw new Error('ASSIGN_DRIVER requires JobOrder and Driver entities');
        }

        const assignmentService = new JobOrderAssignmentService();
        const input: AssignDriverInput = {
          jobOrderId: jobOrder.entityId,
          driverId: driver.entityId,
          fleetId: vehicle?.entityId || null,
          transporterId: null,
          driverPhone: null,
          notes: null,
        };

        const result: JobOrderResult = await assignmentService.assignDriver(identity, input);

        if (!result.success) {
          return {
            executionId,
            status: 'FAILED',
            intent: proposal.intent,
            message: result.error || 'Assignment failed',
            affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
              entityType: e.entityType,
              entityId: e.entityId,
              displayName: e.displayName,
            })) : [],
            timestamp: new Date().toISOString(),
            audit: {
              correlationId: executionId,
              actorUserId: identity.userId,
              actorTenantId: identity.tenantId,
              proposalId: proposal.proposal_number,
            },
          };
        }

        return {
          executionId,
          status: 'SUCCESS',
          intent: proposal.intent,
          message: `Assigned ${driver.displayName} to ${jobOrder.displayName}${vehicle ? ` with vehicle ${vehicle.displayName}` : ''}.`,
          affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            displayName: e.displayName,
          })) : [],
          timestamp: new Date().toISOString(),
          audit: {
            correlationId: executionId,
            actorUserId: identity.userId,
            actorTenantId: identity.tenantId,
            proposalId: proposal.proposal_number,
          },
        };
      }

      case 'CANCEL_JOB': {
        if (!isCopilotActionEnabled('CANCEL_JOB')) {
          throw new Error(`Copilot action CANCEL_JOB is not enabled. Set ${COPILOT_FEATURE_FLAGS.CANCEL_JOB.envVar}=true to enable.`);
        }
        const jobOrder = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'JobOrder') : null;

        if (!jobOrder) {
          throw new Error('CANCEL_JOB requires JobOrder entity');
        }

        const cancellationService = new JobOrderCancellationService();
        const result: JobOrderResult = await cancellationService.cancelJobOrder(identity, {
          jobOrderId: jobOrder.entityId,
          reason: confirmation.confirmationNote || 'Cancelled via Copilot',
        });

        if (!result.success) {
          return {
            executionId,
            status: 'FAILED',
            intent: proposal.intent,
            message: result.error || 'Cancellation failed',
            affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
              entityType: e.entityType,
              entityId: e.entityId,
              displayName: e.displayName,
            })) : [],
            timestamp: new Date().toISOString(),
            audit: {
              correlationId: executionId,
              actorUserId: identity.userId,
              actorTenantId: identity.tenantId,
              proposalId: proposal.proposal_number,
            },
          };
        }

        return {
          executionId,
          status: 'SUCCESS',
          intent: proposal.intent,
          message: `Cancelled job order ${jobOrder.displayName}.`,
          affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            displayName: e.displayName,
          })) : [],
          timestamp: new Date().toISOString(),
          audit: {
            correlationId: executionId,
            actorUserId: identity.userId,
            actorTenantId: identity.tenantId,
            proposalId: proposal.proposal_number,
          },
        };
      }

      case 'REPLACE_DRIVER': {
        if (!isCopilotActionEnabled('REPLACE_DRIVER')) {
          throw new Error(`Copilot action REPLACE_DRIVER is not enabled. Set ${COPILOT_FEATURE_FLAGS.REPLACE_DRIVER.envVar}=true to enable.`);
        }
        const jobOrder = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'JobOrder') : null;
        const driver = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'Driver') : null;
        const vehicle = Array.isArray(proposal.entities) ? proposal.entities.find((e: any) => e.entityType === 'Vehicle') : null;

        if (!jobOrder || !driver) {
          throw new Error('REPLACE_DRIVER requires JobOrder and Driver entities');
        }

        const replacementService = new DriverReplacementService();
        const input: ReplaceDriverInput = {
          jobOrderId: jobOrder.entityId,
          newDriverId: driver.entityId,
          newFleetId: vehicle?.entityId || null,
          newTransporterId: null,
          reason: confirmation.confirmationNote || 'Driver replaced via Copilot',
        };

        const result: JobOrderResult = await replacementService.replaceDriver(identity, input);

        if (!result.success) {
          return {
            executionId,
            status: 'FAILED',
            intent: proposal.intent,
            message: result.error || 'Driver replacement failed',
            affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
              entityType: e.entityType,
              entityId: e.entityId,
              displayName: e.displayName,
            })) : [],
            timestamp: new Date().toISOString(),
            audit: {
              correlationId: executionId,
              actorUserId: identity.userId,
              actorTenantId: identity.tenantId,
              proposalId: proposal.proposal_number,
            },
          };
        }

        return {
          executionId,
          status: 'SUCCESS',
          intent: proposal.intent,
          message: `Replaced driver for ${jobOrder.displayName} with ${driver.displayName}${vehicle ? ` and vehicle ${vehicle.displayName}` : ''}.`,
          affectedEntities: Array.isArray(proposal.entities) ? proposal.entities.map((e: any) => ({
            entityType: e.entityType,
            entityId: e.entityId,
            displayName: e.displayName,
          })) : [],
          timestamp: new Date().toISOString(),
          audit: {
            correlationId: executionId,
            actorUserId: identity.userId,
            actorTenantId: identity.tenantId,
            proposalId: proposal.proposal_number,
          },
        };
      }

      default:
        throw new Error(`No execution handler for intent: ${proposal.intent}`);
    }
  }

  private static async recordExecutionAudit(params: {
    executionId: string;
    proposalId: string;
    intent: string;
    status: 'SUCCESS' | 'FAILED';
    message: string;
    identity: IdentityContext;
    entities: Array<{
      entityType: string;
      entityId: string;
      displayName: string;
      status?: string | null;
    }>;
    confirmation: ExecutionRequest['confirmation'];
  }): Promise<void> {
    try {
      await audit.log({
        module: 'copilot.execute',
        action: 'EXECUTION_COMPLETED',
        user_id: params.identity.userId,
        reference_type: 'copilot_execution',
        reference_id: params.executionId,
        correlation_id: params.executionId,
        severity: params.status === 'FAILED' ? 'high' : 'medium',
        new_data: {
          intent: params.intent,
          proposalId: params.proposalId,
          status: params.status,
          message: params.message,
          entities: params.entities,
          confirmedBy: params.confirmation.confirmedBy,
          confirmedAt: params.confirmation.confirmedAt,
          confirmationNote: params.confirmation.confirmationNote || null,
        },
        metadata: {
          tenantId: params.identity.tenantId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('[ExecutionService] Failed to record execution audit:', error);
    }
  }
}
