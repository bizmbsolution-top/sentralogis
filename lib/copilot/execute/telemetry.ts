/**
 * Sentralogis — AI Copilot Stage 3 EXECUTE
 * lib/copilot/execute/telemetry.ts
 *
 * Minimal production telemetry contract for Copilot execution.
 *
 * Records structured execution events through the existing audit.log
 * infrastructure. No new telemetry vendor is introduced.
 *
 * Does NOT log:
 * - secrets
 * - authentication tokens
 * - credentials
 * - unnecessary personal data
 * - full customer payloads
 * - financial data
 */

import { audit } from '@/lib/audit';

export type CopilotExecutionEvent =
  | 'STARTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CONFLICT'
  | 'ALREADY_EXECUTED';

export interface CopilotExecutionTelemetryParams {
  executionId: string;
  proposalId: string;
  intent: string;
  status: 'SUCCESS' | 'FAILED' | 'DENIED';
  event: CopilotExecutionEvent;
  message: string;
  tenantId: string;
  actorUserId: string;
  durationMs?: number;
  failureCategory?: string;
  claimResult?: string;
  domainServiceResult?: string;
  entities?: Array<{ entityType: string; entityId: string; displayName: string }>;
}

/**
 * Record a Copilot execution telemetry event through the canonical audit log.
 * Failures in telemetry recording are swallowed so they never affect
 * execution semantics or Proposal Authority state.
 */
export function recordCopilotExecution(params: CopilotExecutionTelemetryParams): void {
  try {
    audit.log({
      module: 'copilot.execute',
      action: `EXECUTION_${params.event}`,
      user_id: params.actorUserId,
      reference_type: 'copilot_execution',
      reference_id: params.executionId,
      correlation_id: params.executionId,
      severity: params.status === 'FAILED' || params.event === 'CONFLICT' ? 'high' : 'medium',
      new_data: {
        intent: params.intent,
        proposalId: params.proposalId,
        status: params.status,
        event: params.event,
        message: params.message,
        durationMs: params.durationMs ?? 0,
        failureCategory: params.failureCategory ?? null,
        claimResult: params.claimResult ?? null,
        domainServiceResult: params.domainServiceResult ?? null,
        entities: params.entities ?? [],
      },
      metadata: {
        tenantId: params.tenantId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Telemetry must never weaken execution semantics.
  }
}