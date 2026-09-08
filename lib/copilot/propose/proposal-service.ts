/**
 * Sentralogis — AI Copilot Stage 2 PROPOSE
 * lib/copilot/propose/proposal-service.ts
 *
 * Canonical proposal generation service.
 *
 * PROPOSE = recommend/draft an action.
 * EXECUTE = perform a mutation (Stage 3, NOT authorized here).
 *
 * All proposals require explicit human confirmation before execution.
 * This service never executes mutations.
 *
 * Canonical flow:
 *   Actor Identity
 *   → Tenant Context
 *   → Authorization
 *   → Copilot PROPOSE
 *   → Proposal Generation
 *   → Human Confirmation Required
 *   → (Stage 3: EXECUTE if confirmed)
 */

import type { CopilotProposal, ProposalGenerationInput, ProposalPolicyCheck } from './types';
import { ActionBridge } from '@/src/platforms/copilot/execution/ActionBridge';
import { DecisionPolicyRegistry } from '@/src/platforms/copilot/policy/DecisionPolicyRegistry';
import { ExplainabilityGenerator } from '@/src/platforms/copilot/metrics/ExplainabilityGenerator';
import { EntityResolutionResult } from '@/src/platforms/copilot/intelligence/entities/models';
import { audit } from '@/lib/audit';
import type { ProposalEntity } from './types';
import { ProposalAuthorityService } from './proposal-authority-service';

export class ProposalService {
  /**
   * Generate a Copilot proposal for the given intent and entities.
   *
   * This method:
   * 1. Validates the intent against registered policies
   * 2. Determines required permissions and risk level
   * 3. Generates explainability data
   * 4. Records an audit trail entry
   * 5. Returns a proposal requiring human confirmation
   *
   * It does NOT execute any mutation.
   */
  static async generateProposal(
    input: ProposalGenerationInput,
    resolvedEntities: EntityResolutionResult,
    enrichedContext?: any,
  ): Promise<CopilotProposal> {
    const { intent, description, entities, context } = input;

    const policyResult = this.evaluatePolicy(intent, resolvedEntities);
    const requiredPermissions = ActionBridge.getRequiredPermissions(intent);
    const riskLevel = ActionBridge.getRiskLevel(intent);

    const userPermissions = context.permissions || [];
    const hasPermission = requiredPermissions.length === 0 ||
      requiredPermissions.some((p) => userPermissions.includes(p));

    let finalPolicyStatus = policyResult.status;
    let finalPolicyReason = policyResult.reason;
    let finalPolicyEvidence = policyResult.evidence;
    let finalAlternativeActions = policyResult.alternativeActions;

    if (!hasPermission) {
      finalPolicyStatus = 'REJECTED';
      finalPolicyReason = `Insufficient permissions. Required: ${requiredPermissions.join(', ')}.`;
      finalPolicyEvidence = [`User permissions: ${userPermissions.join(', ') || 'none'}`];
      finalAlternativeActions = [
        'Request permission escalation',
        'Contact administrator',
      ];
    }

    const entitySummaries = entities.map((e) => ({
      entityType: e.entityType,
      entityId: e.entityId,
      displayName: e.displayName,
      status: e.status || null,
    }));

    const explainability = this.buildExplainability(
      intent,
      resolvedEntities,
      policyResult,
      enrichedContext,
    );

    const proposal: CopilotProposal = {
      proposalId: `proposal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      intent,
      description,
      entities: entitySummaries,
      requiredPermissions,
      riskLevel,
      policyCheck: {
        status: finalPolicyStatus,
        reason: finalPolicyReason,
        evidence: finalPolicyEvidence,
        alternativeActions: finalAlternativeActions,
      },
      explainability: {
        summary: explainability.summary,
        details: explainability.details,
        warnings: explainability.warnings,
      },
      humanConfirmationRequired: true,
      confirmationMessage: this.buildConfirmationMessage(intent, entities, riskLevel),
      audit: {
        correlationId: context.correlationId,
        timestamp: new Date().toISOString(),
        actorUserId: context.userId,
        actorTenantId: context.tenantId,
      },
    };

    const authoritativeProposal = await ProposalAuthorityService.createProposal({
      tenantId: context.tenantId,
      actorUserId: context.userId,
      intent: proposal.intent,
      entities: proposal.entities,
      requiredPermissions: proposal.requiredPermissions,
      riskLevel: proposal.riskLevel,
      humanConfirmationRequired: proposal.humanConfirmationRequired,
      explainability: proposal.explainability,
      policyCheck: proposal.policyCheck,
      proposalPayload: {
        description,
        entitySummaries,
      },
      correlationId: proposal.audit.correlationId,
      idempotencyKey: `${context.tenantId}:${intent}:${Date.now()}:${Math.random().toString(36).substring(2, 9)}`,
      expiryAt: null,
    });

    const authoritativeProposalId = authoritativeProposal.proposal_number;

    await this.recordProposalAudit({
      ...proposal,
      proposalId: authoritativeProposalId,
    });

    return {
      ...proposal,
      proposalId: authoritativeProposalId,
    };
  }

  private static evaluatePolicy(
    intent: string,
    resolvedEntities: EntityResolutionResult,
  ): ProposalPolicyCheck {
    const policy = DecisionPolicyRegistry.getPolicy(intent);

    if (!policy) {
      return {
        status: 'ALLOWED',
      };
    }

    const entityTypes = resolvedEntities.resolved().map((e) => e.entityType);
    const matchedBlocking = policy.blockedSituations.find((s) =>
      entityTypes.includes(s.situationId),
    );

    if (matchedBlocking) {
      return {
        status: 'REJECTED',
        reason: matchedBlocking.reason,
        evidence: matchedBlocking.evidence,
        alternativeActions: policy.alternativeActions,
      };
    }

    const matchedWarning = policy.warningSituations.find((s) =>
      entityTypes.includes(s.situationId),
    );

    if (matchedWarning) {
      return {
        status: 'WARNING',
        reason: matchedWarning.reason,
        evidence: matchedWarning.evidence,
        alternativeActions: policy.alternativeActions,
      };
    }

    return {
      status: 'ALLOWED',
    };
  }

  private static buildExplainability(
    intent: string,
    resolvedEntities: EntityResolutionResult,
    policyResult: ProposalPolicyCheck,
    enrichedContext?: any,
  ): { summary: string; details: string; warnings?: string[] } {
    const entityNames = resolvedEntities
      .resolved()
      .map((e) => e.displayName || e.resolvedId)
      .join(', ');

    const summary = `Propose to ${intent.toLowerCase()} for ${entityNames}.`;

    const details = [
      `Intent: ${intent}`,
      `Entities: ${entityNames}`,
      `Policy: ${policyResult.status}`,
      enrichedContext
        ? `Context loaded: ${enrichedContext.contextLoaded ? 'yes' : 'no'}`
        : 'Context loaded: no',
    ].join('\n');

    const warnings: string[] = [];
    if (policyResult.status === 'WARNING') {
      warnings.push(policyResult.reason || 'Policy warning detected.');
    }
    if (policyResult.status === 'REJECTED') {
      warnings.push(policyResult.reason || 'Action blocked by policy.');
    }

    return { summary, details, warnings: warnings.length > 0 ? warnings : undefined };
  }

  private static buildConfirmationMessage(
    intent: string,
    entities: ProposalEntity[],
    riskLevel: string,
  ): string {
    const entityNames = entities.map((e) => e.displayName).join(', ');
    return `Confirm: execute ${intent.toLowerCase()} on ${entityNames}? Risk level: ${riskLevel}. This action requires explicit approval.`;
  }

  private static async recordProposalAudit(proposal: CopilotProposal): Promise<void> {
    try {
      await audit.log({
        module: 'copilot.propose',
        action: 'PROPOSAL_GENERATED',
        user_id: proposal.audit.actorUserId,
        reference_type: 'copilot_proposal',
        reference_id: proposal.proposalId,
        correlation_id: proposal.audit.correlationId,
        severity: proposal.riskLevel === 'CRITICAL' || proposal.riskLevel === 'HIGH' ? 'high' : 'medium',
        new_data: {
          intent: proposal.intent,
          entities: proposal.entities,
          policyStatus: proposal.policyCheck.status,
          requiredPermissions: proposal.requiredPermissions,
          humanConfirmationRequired: proposal.humanConfirmationRequired,
        },
        metadata: {
          tenantId: proposal.audit.actorTenantId,
          timestamp: proposal.audit.timestamp,
        },
      });
    } catch (error) {
      console.error('[ProposalService] Failed to record proposal audit:', error);
    }
  }
}
