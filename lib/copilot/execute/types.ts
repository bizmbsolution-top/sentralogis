/**
 * Sentralogis — AI Copilot Stage 3 EXECUTE
 * lib/copilot/execute/types.ts
 *
 * Canonical execution contracts for Copilot EXECUTE mode.
 *
 * EXECUTE = perform a mutation/workflow.
 * PROPOSE = recommend/draft an action (Stage 2).
 *
 * All executions require:
 * - Explicit human confirmation
 * - Canonical domain service invocation
 * - Server-derived authorization
 * - Audit trail recording
 * - Idempotency via correlation_id
 */

export interface ExecutionRequest {
  proposalId: string;
  proposal?: {
    proposalId: string;
    intent: string;
    entities: Array<{
      entityType: string;
      entityId: string;
      displayName: string;
      status?: string | null;
    }>;
    requiredPermissions: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    confirmationMessage: string;
  };
  confirmation: {
    confirmed: boolean;
    confirmedBy: string;
    confirmedAt: string;
    confirmationNote?: string;
  };
}

export interface ExecutionResult {
  executionId: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  intent: string;
  message: string;
  affectedEntities: Array<{
    entityType: string;
    entityId: string;
    displayName: string;
  }>;
  durationMs: number;
  timestamp: string;
  audit: {
    correlationId: string;
    actorUserId: string;
    actorTenantId: string;
    proposalId: string;
  };
}

export interface ExecutionPolicyCheck {
  authorized: boolean;
  missingPermissions: string[];
  reason?: string;
}
