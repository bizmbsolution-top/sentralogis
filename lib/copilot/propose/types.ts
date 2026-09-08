/**
 * Sentralogis — AI Copilot Stage 2 PROPOSE
 * lib/copilot/propose/types.ts
 *
 * Canonical proposal contracts for Copilot PROPOSE mode.
 *
 * PROPOSE = recommend/draft an action.
 * EXECUTE = perform a mutation (Stage 3, NOT authorized here).
 *
 * All proposals require explicit human confirmation before execution.
 */

export interface ProposalEntity {
  entityType: string;
  entityId: string;
  displayName: string;
  status?: string | null;
}

export interface ProposalPolicyCheck {
  status: 'ALLOWED' | 'WARNING' | 'REJECTED';
  reason?: string;
  evidence?: string[];
  alternativeActions?: string[];
}

export interface CopilotProposal {
  proposalId: string;
  intent: string;
  description: string;
  entities: ProposalEntity[];
  requiredPermissions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  policyCheck: ProposalPolicyCheck;
  explainability: {
    summary: string;
    details: string;
    warnings?: string[];
  };
  humanConfirmationRequired: true;
  confirmationMessage: string;
  audit: {
    correlationId: string;
    timestamp: string;
    actorUserId: string;
    actorTenantId: string;
  };
}

export interface ProposalGenerationInput {
  intent: string;
  description: string;
  entities: ProposalEntity[];
  context: {
    userId: string;
    tenantId: string;
    permissions: string[];
    correlationId: string;
  };
}
