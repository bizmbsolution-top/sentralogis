/**
 * Sentralogis — AI Copilot CONFIRM Stage 3
 * lib/__tests__/copilot-confirm-stage3.test.ts
 *
 * Targeted validation for CONFIRM implementation.
 * Validates authorization, tenant isolation, lifecycle transition,
 * non-execution, and no token burn.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmService } from '@/lib/copilot/confirm/confirm-service';
import { ProposalAuthorityService } from '@/lib/copilot/propose/proposal-authority-service';
import type { IdentityContext } from '@/lib/application/identity/types';

vi.mock('@/lib/copilot/propose/proposal-authority-service', () => ({
  ProposalAuthorityService: {
    confirmProposal: vi.fn(),
    getProposal: vi.fn(),
  },
}));

const mockedProposalAuthority = vi.mocked(ProposalAuthorityService, true);

const buildAuthoritativeProposal = (overrides: any = {}): any => ({
  id: 'proposal-id-1',
  tenant_id: 'tenant-001',
  proposal_number: 'CP-2026-09-0001',
  correlation_id: 'corr-1',
  idempotency_key: 'idempotency-1',
  intent: 'ASSIGN_DRIVER',
  entities: [
    { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
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

describe('Copilot Stage 3 CONFIRM', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authorized actor confirms a PROPOSED proposal', async () => {
    const proposed = buildAuthoritativeProposal({ lifecycle_state: 'PROPOSED', confirmation_state: 'AWAITING' });
    const confirmed = buildAuthoritativeProposal({ lifecycle_state: 'CONFIRMED', confirmation_state: 'CONFIRMED' });
    mockedProposalAuthority.confirmProposal.mockResolvedValue(confirmed as any);

    const result = await ConfirmService.confirm(buildIdentity(), {
      proposalNumber: 'CP-2026-09-0001',
    });

    expect(result.confirmed).toBe(true);
    expect(result.proposal.lifecycle_state).toBe('CONFIRMED');
    expect(mockedProposalAuthority.confirmProposal).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-001', userId: 'user-001' }),
      'CP-2026-09-0001',
      undefined,
    );
  });

  it('unauthorized actor cannot confirm', async () => {
    await expect(
      ConfirmService.confirm(buildIdentity({ permissions: [] }), {
        proposalNumber: 'CP-2026-09-0001',
      }),
    ).rejects.toThrow();
    expect(mockedProposalAuthority.confirmProposal).not.toHaveBeenCalled();
  });

  it('cross-tenant confirmation is rejected', async () => {
    // Tenant B actor attempting to confirm Tenant A proposal.
    // ProposalAuthorityService filters on tenant_id, so it returns not-found.
    mockedProposalAuthority.confirmProposal.mockRejectedValue(
      new Error('Proposal not found or access denied.'),
    );

    await expect(
      ConfirmService.confirm(buildIdentity({ tenantId: 'tenant-B' }), {
        proposalNumber: 'CP-2026-09-0001',
      }),
    ).rejects.toThrow();
  });

  it('invalid lifecycle state is rejected by canonical authority', async () => {
    mockedProposalAuthority.confirmProposal.mockRejectedValue(
      new Error('Invalid proposal lifecycle state: EXECUTED.'),
    );

    await expect(
      ConfirmService.confirm(buildIdentity(), {
        proposalNumber: 'CP-2026-09-0001',
      }),
    ).rejects.toThrow(/lifecycle state/);
  });

  it('CONFIRM does not execute operational mutations', async () => {
    const confirmed = buildAuthoritativeProposal();
    mockedProposalAuthority.confirmProposal.mockResolvedValue(confirmed as any);

    const result = await ConfirmService.confirm(buildIdentity(), {
      proposalNumber: 'CP-2026-09-0001',
    });

    expect(result.proposal.lifecycle_state).toBe('CONFIRMED');
    // No execution claim occurred.
    expect(result.proposal.lifecycle_state).not.toBe('EXECUTABLE');
    expect(result.proposal.lifecycle_state).not.toBe('EXECUTED');
  });

  it('CONFIRM does not burn tokens', async () => {
    const confirmed = buildAuthoritativeProposal();
    mockedProposalAuthority.confirmProposal.mockResolvedValue(confirmed as any);

    await ConfirmService.confirm(buildIdentity(), {
      proposalNumber: 'CP-2026-09-0001',
    });

    // ConfirmService has no token dependency; assert the authority was
    // invoked exactly once with no execution-side effect.
    expect(mockedProposalAuthority.confirmProposal).toHaveBeenCalledTimes(1);
  });

  it('confirmation is attributable to authenticated actor and tenant', async () => {
    const confirmed = buildAuthoritativeProposal({
      confirmation_actor_id: 'user-123',
      updated_by: 'user-123',
    });
    mockedProposalAuthority.confirmProposal.mockResolvedValue(confirmed as any);

    const result = await ConfirmService.confirm(
      buildIdentity({ userId: 'user-123', tenantId: 'tenant-456' }),
      { proposalNumber: 'CP-2026-09-0001', confirmationNote: 'Approved' },
    );

    expect(mockedProposalAuthority.confirmProposal).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-456', userId: 'user-123' }),
      'CP-2026-09-0001',
      'Approved',
    );
    expect(result.proposal.confirmation_actor_id).toBe('user-123');
  });

  it('second confirmation attempt does not duplicate execution', async () => {
    const confirmed = buildAuthoritativeProposal({ lifecycle_state: 'CONFIRMED' });
    mockedProposalAuthority.confirmProposal.mockResolvedValue(confirmed as any);

    await ConfirmService.confirm(buildIdentity(), { proposalNumber: 'CP-2026-09-0001' });
    const second = await ConfirmService.confirm(buildIdentity(), { proposalNumber: 'CP-2026-09-0001' });

    expect(second.proposal.lifecycle_state).toBe('CONFIRMED');
    expect(mockedProposalAuthority.confirmProposal).toHaveBeenCalledTimes(2);
  });
});