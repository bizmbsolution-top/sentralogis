/**
 * Sentralogis — AI Copilot Stage 3
 * lib/copilot/propose/proposal-authority-service.ts
 *
 * Canonical Proposal Authority Service.
 *
 * Owns persistence and retrieval of authoritative Copilot proposals
 * in the copilot_proposals table. This is the only application path
 * that may read or write proposal authority state.
 *
 * ADR-090: Persistent Server-Side Proposal Store.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';

export interface AuthoritativeProposal {
  id: string;
  tenant_id: string;
  proposal_number: string;
  correlation_id: string;
  idempotency_key: string;
  intent: string;
  entities: any;
  required_permissions: string[];
  risk_level: string;
  human_confirmation_required: boolean;
  confirmation_state: string;
  confirmation_actor_id: string | null;
  confirmation_at: string | null;
  confirmation_note: string | null;
  explainability: any;
  policy_check: any;
  proposal_payload: any;
  lifecycle_state: string;
  expiry_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  outcome?: 'CLAIMED' | 'ALREADY_EXECUTED' | 'CONFLICT' | 'INVALID_STATE';
}

export interface CreateProposalInput {
  tenantId: string;
  actorUserId: string | null;
  intent: string;
  entities: any;
  requiredPermissions: string[];
  riskLevel: string;
  humanConfirmationRequired: boolean;
  explainability?: any;
  policyCheck?: any;
  proposalPayload?: any;
  correlationId?: string;
  idempotencyKey: string;
  expiryAt?: string | null;
}

export interface ProposalAuthorityError {
  code: 'PROPOSAL_NOT_FOUND' | 'TENANT_MISMATCH' | 'LIFECYCLE_INVALID' | 'CONFIRMATION_INVALID' | 'EXPIRED' | 'CANCELLED' | 'REJECTED';
  message: string;
}

export class ProposalAuthorityService {
  /**
   * Create an authoritative proposal record.
   */
  static async createProposal(input: CreateProposalInput): Promise<AuthoritativeProposal> {
    const { tenantId, actorUserId, intent, entities, requiredPermissions, riskLevel, humanConfirmationRequired, explainability, policyCheck, proposalPayload, correlationId, idempotencyKey, expiryAt } = input;

    const proposalNumber = await this.nextProposalNumber(tenantId);

    const payload: any = {
      tenant_id: tenantId,
      proposal_number: proposalNumber,
      correlation_id: correlationId || generateCorrelationId(),
      idempotency_key: idempotencyKey,
      intent,
      entities,
      required_permissions: requiredPermissions,
      risk_level: riskLevel,
      human_confirmation_required: humanConfirmationRequired,
      confirmation_state: 'AWAITING',
      explainability: explainability || null,
      policy_check: policyCheck || null,
      proposal_payload: proposalPayload || {},
      lifecycle_state: 'PROPOSED',
      expiry_at: expiryAt || null,
      created_by: actorUserId,
      updated_by: actorUserId,
    };

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create proposal: ${error.message}`);
    }

    return mapProposalRow(data);
  }

  /**
   * Retrieve an authoritative proposal by proposal number, enforcing tenant ownership.
   */
  static async getProposal(identity: IdentityContext, proposalNumber: string): Promise<AuthoritativeProposal> {
    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .select('*')
      .eq('tenant_id', identity.tenantId)
      .eq('proposal_number', proposalNumber)
      .single();

    if (error || !data) {
      throw proposalNotFound();
    }

    return mapProposalRow(data);
  }

  /**
   * Retrieve an authoritative proposal by internal UUID, enforcing tenant ownership.
   */
  static async getProposalById(identity: IdentityContext, proposalId: string): Promise<AuthoritativeProposal> {
    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .select('*')
      .eq('tenant_id', identity.tenantId)
      .eq('id', proposalId)
      .single();

    if (error || !data) {
      throw proposalNotFound();
    }

    return mapProposalRow(data);
  }

  /**
   * Atomically claim a proposal for execution.
   * E9: Only one concurrent request can transition CONFIRMED → EXECUTABLE.
   * Returns outcome: CLAIMED, ALREADY_EXECUTED, CONFLICT, INVALID_STATE.
   */
  static async claimProposalForExecution(identity: IdentityContext, proposalNumber: string): Promise<AuthoritativeProposal> {
    const { data, error } = await supabaseAdmin.rpc('claim_proposal_for_execution', {
      p_proposal_number: proposalNumber,
      p_actor_user_id: identity.userId,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      throw proposalNotFound();
    }

    const row = data[0];
    return mapClaimRow(row);
  }

  /**
   * Mark proposal as confirmed by the given actor.
   */
  static async confirmProposal(identity: IdentityContext, proposalNumber: string, note?: string): Promise<AuthoritativeProposal> {
    const proposal = await this.getProposal(identity, proposalNumber);

    if (proposal.lifecycle_state !== 'PROPOSED' && proposal.lifecycle_state !== 'AWAITING_CONFIRMATION') {
      throw lifecycleInvalid(proposal.lifecycle_state);
    }

    if (proposal.expiry_at && new Date(proposal.expiry_at).getTime() < Date.now()) {
      throw proposalExpired();
    }

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .update({
        confirmation_state: 'CONFIRMED',
        confirmation_actor_id: identity.userId,
        confirmation_at: new Date().toISOString(),
        confirmation_note: note || null,
        lifecycle_state: 'CONFIRMED',
        updated_by: identity.userId,
      })
      .eq('id', proposal.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to confirm proposal: ${error?.message || 'unknown error'}`);
    }

    return mapProposalRow(data);
  }

  /**
   * Mark proposal as rejected.
   */
  static async rejectProposal(identity: IdentityContext, proposalNumber: string, note?: string): Promise<AuthoritativeProposal> {
    const proposal = await this.getProposal(identity, proposalNumber);

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .update({
        confirmation_state: 'REJECTED',
        confirmation_actor_id: identity.userId,
        confirmation_at: new Date().toISOString(),
        confirmation_note: note || null,
        lifecycle_state: 'REJECTED',
        updated_by: identity.userId,
      })
      .eq('id', proposal.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to reject proposal: ${error?.message || 'unknown error'}`
      );
    }

    return mapProposalRow(data);
  }

  /**
   * Mark proposal as executable after successful authorization.
   * This is the E7 idempotency gate: only CONFIRMED proposals may enter
   * the execution boundary. Returns the authoritative proposal in EXECUTABLE
   * state. If the proposal is already EXECUTED, returns the existing state
   * for safe retry semantics.
   */
  static async executeProposal(identity: IdentityContext, proposalNumber: string): Promise<AuthoritativeProposal> {
    const proposal = await this.getProposal(identity, proposalNumber);

    if (proposal.lifecycle_state === 'EXECUTED') {
      return proposal;
    }

    if (proposal.lifecycle_state !== 'CONFIRMED') {
      throw lifecycleInvalid(proposal.lifecycle_state);
    }

    if (proposal.expiry_at && new Date(proposal.expiry_at).getTime() < Date.now()) {
      throw proposalExpired();
    }

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .update({
        lifecycle_state: 'EXECUTABLE',
        updated_by: identity.userId,
      })
      .eq('id', proposal.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark proposal executable: ${error?.message || 'unknown error'}`
      );
    }

    return mapProposalRow(data);
  }

  /**
   * Record execution result and mark proposal as EXECUTED.
   * This is terminal state — further executions are not permitted.
   */
  static async recordExecutionResult(
    identity: IdentityContext,
    proposalNumber: string,
    executionId: string,
    result: {
      status: 'SUCCESS' | 'FAILED';
      message: string;
      affectedEntities?: Array<{ entityType: string; entityId: string; displayName: string }>;
    },
  ): Promise<AuthoritativeProposal> {
    const proposal = await this.getProposal(identity, proposalNumber);

    if (proposal.lifecycle_state === 'EXECUTED') {
      return proposal;
    }

    const executionRecord = {
      executionId,
      status: result.status,
      message: result.message,
      affectedEntities: result.affectedEntities || [],
      executedAt: new Date().toISOString(),
      executedBy: identity.userId,
    };

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .update({
        lifecycle_state: 'EXECUTED',
        proposal_payload: {
          ...(proposal.proposal_payload || {}),
          executionResult: executionRecord,
        },
        updated_by: identity.userId,
      })
      .eq('id', proposal.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to record execution result: ${error?.message || 'unknown error'}`
      );
    }

    return mapProposalRow(data);
  }

  /**
   * Mark proposal as executed.
   */
  static async markExecuted(identity: IdentityContext, proposalNumber: string): Promise<AuthoritativeProposal> {
    const proposal = await this.getProposal(identity, proposalNumber);

    const { data, error } = await supabaseAdmin
      .from('copilot_proposals')
      .update({
        lifecycle_state: 'EXECUTED',
        updated_by: identity.userId,
      })
      .eq('id', proposal.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to mark proposal executed: ${error?.message || 'unknown error'}`
      );
    }

    return mapProposalRow(data);
  }

  /**
   * Atomic server-side proposal number generation.
   * Format: CP-YYYY-MM-NNNN
   */
  private static async nextProposalNumber(tenantId: string): Promise<string> {
    const { data, error } = await supabaseAdmin.rpc('next_copilot_proposal_number', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to generate proposal number: ${error.message}`);
    }

    return data as string;
  }
}

function mapProposalRow(row: Record<string, any>): AuthoritativeProposal {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    proposal_number: row.proposal_number,
    correlation_id: row.correlation_id,
    idempotency_key: row.idempotency_key,
    intent: row.intent,
    entities: row.entities,
    required_permissions: row.required_permissions,
    risk_level: row.risk_level,
    human_confirmation_required: row.human_confirmation_required,
    confirmation_state: row.confirmation_state,
    confirmation_actor_id: row.confirmation_actor_id,
    confirmation_at: row.confirmation_at,
    confirmation_note: row.confirmation_note,
    explainability: row.explainability,
    policy_check: row.policy_check,
    proposal_payload: row.proposal_payload,
    lifecycle_state: row.lifecycle_state,
    expiry_at: row.expiry_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
  };
}

function mapClaimRow(row: Record<string, any>): AuthoritativeProposal {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    proposal_number: row.proposal_number,
    correlation_id: row.correlation_id,
    idempotency_key: row.idempotency_key,
    intent: row.intent,
    entities: row.entities,
    required_permissions: row.required_permissions,
    risk_level: row.risk_level,
    human_confirmation_required: row.human_confirmation_required,
    confirmation_state: row.confirmation_state,
    confirmation_actor_id: row.confirmation_actor_id,
    confirmation_at: row.confirmation_at,
    confirmation_note: row.confirmation_note,
    explainability: row.explainability,
    policy_check: row.policy_check,
    proposal_payload: row.proposal_payload,
    lifecycle_state: row.lifecycle_state,
    expiry_at: row.expiry_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
    updated_by: row.updated_by,
    outcome: row.outcome,
  };
}

function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function proposalNotFound(): ProposalAuthorityError {
  return {
    code: 'PROPOSAL_NOT_FOUND',
    message: 'Proposal not found or access denied.',
  };
}

export function lifecycleInvalid(state: string): ProposalAuthorityError {
  return {
    code: 'LIFECYCLE_INVALID',
    message: `Invalid proposal lifecycle state: ${state}.`,
  };
}

export function proposalExpired(): ProposalAuthorityError {
  return {
    code: 'EXPIRED',
    message: 'Proposal has expired.',
  };
}

export function confirmationRequired(): ProposalAuthorityError {
  return {
    code: 'CONFIRMATION_INVALID',
    message: 'Proposal requires human confirmation.',
  };
}
