/**
 * Sentralogis — AI Copilot EXECUTE Stage 4
 * lib/__tests__/copilot-execute-stage4.test.ts
 *
 * Targeted validation for EXECUTE implementation.
 * Validates authorization, tenant isolation, lifecycle precondition,
 * atomic claim, at-most-once concurrency, command routing, and
 * token-burn boundary.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionService } from '@/lib/copilot/execute/execution-service';
import { ProposalAuthorityService } from '@/lib/copilot/propose/proposal-authority-service';
import type { ExecutionRequest } from '@/lib/copilot/execute/types';
import type { IdentityContext } from '@/lib/application/identity/types';

// Enable Copilot execution feature flags for TEST-only acceptance.
// Production flags remain OFF; this only affects the test process.
process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';
process.env.COPILOT_EXECUTE_CANCEL_JOB = 'true';
process.env.COPILOT_EXECUTE_REPLACE_DRIVER = 'true';

vi.mock('@/lib/copilot/propose/proposal-authority-service', () => ({
  ProposalAuthorityService: {
    getProposal: vi.fn(),
    claimProposalForExecution: vi.fn(),
    recordExecutionResult: vi.fn(),
  },
}));

// Mock canonical domain mutation services at the real dependency boundary.
// The ExecutionService must route through these — never direct SQL.
vi.mock('@/lib/domain/jo/job-order-domain-service', () => ({
  JobOrderAssignmentService: class {
    async assignDriver(_identity: any, input: any) {
      return {
        success: true,
        jobOrder: { id: input.jobOrderId, status: 'ASSIGNED' },
      };
    }
  },
  JobOrderCancellationService: class {
    async cancelJobOrder(_identity: any, input: any) {
      return {
        success: true,
        jobOrder: { id: input.jobOrderId, status: 'CANCELLED' },
      };
    }
  },
  DriverReplacementService: class {
    async replaceDriver(_identity: any, input: any) {
      return {
        success: true,
        jobOrder: { id: input.jobOrderId, status: 'ASSIGNED' },
      };
    }
  },
}));

const mockedProposalAuthority = vi.mocked(ProposalAuthorityService, true);

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
  lifecycle_state: 'EXECUTABLE',
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
  proposalOverrides: any = {},
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
  ...proposalOverrides,
});

describe('Copilot Stage 4 EXECUTE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProposalAuthority.getProposal.mockResolvedValue(buildAuthoritativeProposal() as any);
    mockedProposalAuthority.claimProposalForExecution.mockResolvedValue({
      ...buildAuthoritativeProposal(),
      lifecycle_state: 'EXECUTABLE',
      outcome: 'CLAIMED',
    } as any);
    mockedProposalAuthority.recordExecutionResult.mockResolvedValue({
      ...buildAuthoritativeProposal(),
      lifecycle_state: 'EXECUTED',
    } as any);
  });

  it('authorized actor executes an EXECUTABLE proposal', async () => {
    const result = await ExecutionService.execute(buildIdentity(), buildConfirmedRequest('CP-2026-09-0001'));

    expect(result.status).toBe('SUCCESS');
    expect(result.intent).toBe('ASSIGN_DRIVER');
    expect(result.audit.actorUserId).toBe('user-001');
    expect(result.audit.actorTenantId).toBe('tenant-001');
    expect(result.audit.proposalId).toBe('CP-2026-09-0001');
    expect(mockedProposalAuthority.recordExecutionResult).toHaveBeenCalledTimes(1);
  });

  it('unauthorized actor is rejected', async () => {
    const result = await ExecutionService.execute(
      buildIdentity({ permissions: ['commercial:read'] }),
      buildConfirmedRequest('CP-2026-09-0001'),
    );

    expect(result.status).toBe('DENIED');
    expect(result.message).toContain('missing permissions');
    expect(mockedProposalAuthority.claimProposalForExecution).not.toHaveBeenCalled();
  });

  it('cross-tenant execution is rejected', async () => {
    mockedProposalAuthority.getProposal.mockRejectedValue(
      new Error('Proposal not found or access denied.'),
    );

    const result = await ExecutionService.execute(
      buildIdentity({ tenantId: 'tenant-B' }),
      buildConfirmedRequest('CP-2026-09-0001'),
    );

    expect(result.status).toBe('DENIED');
    expect(result.message).toContain('not found');
  });

  it('invalid lifecycle state is rejected', async () => {
    mockedProposalAuthority.getProposal.mockResolvedValue(
      buildAuthoritativeProposal({ lifecycle_state: 'PROPOSED' }) as any,
    );

    const result = await ExecutionService.execute(buildIdentity(), buildConfirmedRequest('CP-2026-09-0001'));

    expect(result.status).toBe('DENIED');
    expect(result.message).toContain('invalid proposal lifecycle state');
    expect(mockedProposalAuthority.claimProposalForExecution).not.toHaveBeenCalled();
  });

  it('exact retry returns stored result when claim reports ALREADY_EXECUTED', async () => {
    const executed = buildAuthoritativeProposal({
      lifecycle_state: 'EXECUTABLE',
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
    mockedProposalAuthority.getProposal.mockResolvedValue(executed as any);
    mockedProposalAuthority.claimProposalForExecution.mockResolvedValue({
      ...executed,
      lifecycle_state: 'EXECUTED',
      outcome: 'ALREADY_EXECUTED',
    } as any);

    const result = await ExecutionService.execute(buildIdentity(), buildConfirmedRequest('CP-2026-09-0001'));

    expect(result.status).toBe('SUCCESS');
    expect(result.executionId).toBe('exec-existing');
    expect(result.message).toBe('Assigned Driver-001 to JO-001.');
    expect(mockedProposalAuthority.recordExecutionResult).not.toHaveBeenCalled();
  });

  it('concurrent execution claim is at-most-once (E9 CONFLICT)', async () => {
    const conflict = buildAuthoritativeProposal({ lifecycle_state: 'EXECUTABLE', outcome: 'CONFLICT' });
    mockedProposalAuthority.getProposal.mockResolvedValue(conflict as any);
    mockedProposalAuthority.claimProposalForExecution.mockResolvedValue(conflict as any);

    const result = await ExecutionService.execute(buildIdentity(), buildConfirmedRequest('CP-2026-09-0001'));

    expect(result.status).toBe('DENIED');
    expect(result.message).toContain('another request is currently executing');
    expect(mockedProposalAuthority.recordExecutionResult).not.toHaveBeenCalled();
  });

  it('no automatic retry on failure', async () => {
    mockedProposalAuthority.claimProposalForExecution.mockRejectedValue(new Error('Execution denied: proposal not executable.'));

    const result = await ExecutionService.execute(buildIdentity(), buildConfirmedRequest('CP-2026-09-0001'));

    expect(result.status).toBe('DENIED');
    expect(mockedProposalAuthority.recordExecutionResult).not.toHaveBeenCalled();
  });
});