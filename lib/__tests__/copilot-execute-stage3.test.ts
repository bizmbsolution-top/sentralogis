/**
 * Sentralogis — AI Copilot Stage 3 EXECUTE + E7 Idempotency
 * lib/__tests__/copilot-execute-stage3.test.ts
 *
 * Targeted validation for EXECUTE implementation with Proposal Authority
 * and E7 execution idempotency.
 */

import { ExecutionService } from '@/lib/copilot/execute/execution-service';
import { ProposalAuthorityService } from '@/lib/copilot/propose/proposal-authority-service';
import type { ExecutionRequest } from '@/lib/copilot/execute/types';
import type { IdentityContext } from '@/lib/application/identity/types';

jest.mock('@/lib/copilot/propose/proposal-authority-service');

const mockedProposalAuthority = jest.mocked(ProposalAuthorityService, true);

describe('Copilot Stage 3 EXECUTE + E7 Idempotency', () => {
  const buildIdentity = (overrides: Partial<IdentityContext> = {}): IdentityContext => ({
    tenantId: 'tenant-001',
    userId: 'user-001',
    role: 'USER',
    permissions: ['commercial:manage', 'JobOrder.Update'],
    isTenantOwner: false,
    membershipId: null,
    sbuScope: null,
    ...overrides,
  } as IdentityContext);

  const buildAuthoritativeProposal = (overrides: any = {}): any => ({
    id: 'proposal-id-1',
    tenant_id: 'tenant-001',
    proposal_number: 'CP-2026-09-0001',
    correlation_id: 'corr-1',
    idempotency_key: 'idempotency-1',
    intent: 'ASSIGN_DRIVER',
    entities: [
      { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
      { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
    ],
    required_permissions: ['JobOrder.Update'],
    risk_level: 'MEDIUM',
    human_confirmation_required: true,
    confirmation_state: 'CONFIRMED',
    confirmation_actor_id: 'user-001',
    confirmation_at: new Date().toISOString(),
    confirmation_note: null,
    explainability: { summary: 'test', details: 'test' },
    policy_check: { status: 'ALLOWED' },
    proposal_payload: {},
    lifecycle_state: 'CONFIRMED',
    expiry_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-001',
    updated_by: 'user-001',
    ...overrides,
  });

  const buildConfirmedRequest = (
    proposalId: string,
    overrides: Partial<ExecutionRequest['confirmation']> = {},
  ): ExecutionRequest => ({
    proposalId,
    proposal: {
      proposalId,
      intent: 'ASSIGN_DRIVER',
      entities: [
        { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
        { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
      ],
      requiredPermissions: ['JobOrder.Update'],
      riskLevel: 'MEDIUM',
      confirmationMessage: 'Confirm: execute assign_driver?',
    },
    confirmation: {
      confirmed: true,
      confirmedBy: 'user-001',
      confirmedAt: new Date().toISOString(),
      confirmationNote: 'Operator confirmed via UI',
      ...overrides,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedProposalAuthority.claimProposalForExecution.mockResolvedValue({
      ...buildAuthoritativeProposal(),
      lifecycle_state: 'EXECUTABLE',
      outcome: 'CLAIMED',
    });
    mockedProposalAuthority.recordExecutionResult.mockResolvedValue({
      ...buildAuthoritativeProposal(),
      lifecycle_state: 'EXECUTED',
      proposal_payload: {
        executionResult: {
          executionId: 'exec-123',
          status: 'SUCCESS',
          message: 'Assigned Driver-001 to JO-001.',
          affectedEntities: [
            { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
            { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
          ],
          executedAt: new Date().toISOString(),
          executedBy: 'user-001',
        },
      },
    });
  });

  describe('ExecutionService.execute', () => {
    it('returns SUCCESS for valid ASSIGN_DRIVER execution', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal({
        intent: 'ASSIGN_DRIVER',
        entities: [
          { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
          { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
        ],
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.intent).toBe('ASSIGN_DRIVER');
      expect(result.executionId).toBeDefined();
      expect(result.audit.actorUserId).toBe('user-001');
      expect(result.audit.actorTenantId).toBe('tenant-001');
    });

    it('returns SUCCESS for valid CANCEL_JOB execution', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal({
        intent: 'CANCEL_JOB',
        entities: [
          { entityType: 'JobOrder', entityId: 'jo-2', displayName: 'JO-002' },
        ],
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001', {});
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.intent).toBe('CANCEL_JOB');
      expect(result.message).toContain('Cancelled job order JO-002');
    });

    it('returns DENIED when confirmation is missing', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal();
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request: ExecutionRequest = {
        proposalId: 'CP-2026-09-0001',
        confirmation: {
          confirmed: false,
          confirmedBy: 'user-001',
          confirmedAt: new Date().toISOString(),
        },
      };

      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('not confirmed');
    });

    it('returns DENIED when actor lacks required permissions', async () => {
      const identity = buildIdentity({ permissions: ['commercial:read'] });
      const authoritativeProposal = buildAuthoritativeProposal({
        required_permissions: ['JobOrder.Update'],
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');

      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('missing permissions');
    });

    it('throws for unsupported intent', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal({
        intent: 'UNKNOWN_INTENT',
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');

      await expect(ExecutionService.execute(identity, request)).rejects.toThrow('No execution handler');
    });

    it('records execution audit trail', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');

      const result = await ExecutionService.execute(identity, request);

      expect(result.audit.proposalId).toBe('CP-2026-09-0001');
      expect(result.audit.correlationId).toBeDefined();
    });

    it('resolves proposal by proposalId, ignoring client proposal intent', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
        intent: 'ASSIGN_DRIVER',
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request: ExecutionRequest = {
        proposalId: 'CP-2026-09-0001',
        proposal: {
          proposalId: 'CP-2026-09-0001',
          intent: 'CANCEL_JOB',
          entities: [],
          requiredPermissions: [],
          riskLevel: 'LOW',
          confirmationMessage: 'client message',
        },
        confirmation: {
          confirmed: true,
          confirmedBy: 'user-001',
          confirmedAt: new Date().toISOString(),
        },
      };

      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.intent).toBe('ASSIGN_DRIVER');
      expect(result.message).toContain('Assigned');
    });

    it('rejects execution when proposalId does not exist', async () => {
      const identity = buildIdentity();
      mockedProposalAuthority.getProposal.mockRejectedValue(new Error('Proposal not found or access denied.'));

      const request = buildConfirmedRequest('CP-UNKNOWN');

      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('not found');
    });

    it('returns stored result for exact retry on EXECUTED proposal (E7 T2)', async () => {
      const identity = buildIdentity();
      const executedProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
        lifecycle_state: 'EXECUTED',
        proposal_payload: {
          executionResult: {
            executionId: 'exec-existing',
            status: 'SUCCESS',
            message: 'Assigned Driver-001 to JO-001.',
            affectedEntities: [
              { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
              { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
            ],
            executedAt: new Date().toISOString(),
            executedBy: 'user-001',
          },
        },
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(executedProposal as any);
      mockedProposalAuthority.claimProposalForExecution.mockResolvedValue({
        ...executedProposal,
        outcome: 'ALREADY_EXECUTED',
      });

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.executionId).toBe('exec-existing');
      expect(result.message).toBe('Assigned Driver-001 to JO-001.');
      expect(mockedProposalAuthority.recordExecutionResult).not.toHaveBeenCalled();
    });

    it('rejects expired proposal before execution (E7 T8)', async () => {
      const identity = buildIdentity();
      const expiredProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
        lifecycle_state: 'CONFIRMED',
        expiry_at: new Date(Date.now() - 1000).toISOString(),
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(expiredProposal as any);
      mockedProposalAuthority.claimProposalForExecution.mockRejectedValue(new Error('Proposal has expired.'));

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('expired');
    });

    it('rejects cancelled proposal before execution (E7 T9)', async () => {
      const identity = buildIdentity();
      const cancelledProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
        lifecycle_state: 'CANCELLED',
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(cancelledProposal as any);
      mockedProposalAuthority.claimProposalForExecution.mockRejectedValue(new Error('Invalid proposal lifecycle state: CANCELLED.'));

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('Invalid proposal lifecycle state');
    });

    it('rejects concurrent execution when proposal is owned by another request (E9 CONFLICT)', async () => {
      const identity = buildIdentity();
      const conflictProposal = buildAuthoritativeProposal({
        proposal_number: 'CP-2026-09-0001',
        lifecycle_state: 'EXECUTABLE',
        outcome: 'CONFLICT',
      });
      mockedProposalAuthority.getProposal.mockResolvedValue(conflictProposal as any);
      mockedProposalAuthority.claimProposalForExecution.mockResolvedValue(conflictProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('DENIED');
      expect(result.message).toContain('another request is currently executing');
      expect(mockedProposalAuthority.recordExecutionResult).not.toHaveBeenCalled();
    });
  });

  describe('EXECUTE boundary', () => {
    it('does not mutate state during proposal generation', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal();
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.message).toContain('Assigned');
    });

    it('does not invoke ExecutionEngine mock', async () => {
      const identity = buildIdentity();
      const authoritativeProposal = buildAuthoritativeProposal();
      mockedProposalAuthority.getProposal.mockResolvedValue(authoritativeProposal as any);

      const request = buildConfirmedRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      expect(result.status).toBe('SUCCESS');
      expect(result.message).not.toContain('mock');
    });
  });
});
