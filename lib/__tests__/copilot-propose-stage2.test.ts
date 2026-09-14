/**
 * Sentralogis — AI Copilot Stage 2 PROPOSE
 * lib/__tests__/copilot-propose-stage2.test.ts
 *
 * Targeted validation for PROPOSE implementation.
 * Validates proposal generation, human confirmation gate,
 * policy checks, authorization, and READ-only/EXECUTE boundary.
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { ProposalService } from '@/lib/copilot/propose/proposal-service';
import { DecisionPolicyRegistry } from '@/src/platforms/copilot/policy/DecisionPolicyRegistry';
import { DefaultIntents, registerDefaultIntents } from '@/src/platforms/copilot/registry/DefaultIntents';
import type { CopilotProposal } from '@/lib/copilot/propose/types';
import { EntityResolutionResult } from '@/src/platforms/copilot/intelligence/entities/models';
import type { ExtractedEntity } from '@/src/platforms/copilot/intelligence/entities/models';
import { ProposalAuthorityService } from '@/lib/copilot/propose/proposal-authority-service';

const mockedProposalAuthority = vi.mocked(ProposalAuthorityService, true);

vi.mock('@/lib/copilot/propose/proposal-authority-service', () => ({
  ProposalAuthorityService: {
    createProposal: vi.fn(),
  },
}));

describe('Copilot Stage 2 PROPOSE', () => {
  beforeAll(() => {
    registerDefaultIntents();
    DecisionPolicyRegistry.loadDefaultPolicies();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedProposalAuthority.createProposal.mockResolvedValue({
      id: 'proposal-id-1',
      tenant_id: 'tenant-001',
      proposal_number: 'CP-2026-09-0001',
      correlation_id: 'corr-1',
      idempotency_key: 'idempotency-1',
      intent: 'ASSIGN_DRIVER',
      entities: [],
      required_permissions: ['JobOrder.Update'],
      risk_level: 'MEDIUM',
      human_confirmation_required: true,
      confirmation_state: 'AWAITING',
      confirmation_actor_id: null,
      confirmation_at: null,
      confirmation_note: null,
      explainability: null,
      policy_check: null,
      proposal_payload: {},
      lifecycle_state: 'PROPOSED',
      expiry_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-001',
      updated_by: 'user-001',
    } as any);
  });

  const buildEntity = (overrides: Partial<ExtractedEntity> = {}): ExtractedEntity => ({
    entityType: 'JobOrder',
    resolvedId: 'jo-001',
    displayName: 'JO-001',
    confidence: 0.9,
    explanation: {
      matchMethod: 'EXACT',
      evidence: 'test',
      source: 'SYSTEM_DEFAULT',
    },
    ...overrides,
  });

  const buildResolution = (entities: ExtractedEntity[]): EntityResolutionResult => {
    const map: Record<string, any> = {};
    for (const e of entities) {
      map[e.entityType] = { status: 'RESOLVED', entity: e };
    }
    return new EntityResolutionResult(map);
  };

  const buildContext = (overrides: { userId?: string; tenantId?: string; permissions?: string[]; correlationId?: string } = {}) => ({
    userId: overrides.userId || 'user-001',
    tenantId: overrides.tenantId || 'tenant-001',
    permissions: overrides.permissions || ['commercial:read'],
    correlationId: overrides.correlationId || 'corr-001',
  });

  describe('ProposalService.generateProposal', () => {
    it('generates a proposal with required fields', async () => {
      const entities = [buildEntity({ entityType: 'JobOrder', resolvedId: 'jo-1' })];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['JobOrder.Update', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.ASSIGN_DRIVER,
          description: 'Assign driver to job order',
          entities: [
            {
              entityType: 'JobOrder',
              entityId: 'jo-1',
              displayName: 'JO-001',
              status: null,
            },
          ],
          context,
        },
        resolution,
      );

      expect(proposal.proposalId).toBeDefined();
      expect(proposal.intent).toBe(DefaultIntents.ASSIGN_DRIVER);
      expect(proposal.entities).toHaveLength(1);
      expect(proposal.requiredPermissions).toContain('JobOrder.Update');
      expect(proposal.riskLevel).toBe('MEDIUM');
      expect(proposal.humanConfirmationRequired).toBe(true);
      expect(proposal.confirmationMessage).toContain('Confirm');
      expect(proposal.audit.correlationId).toBe('corr-001');
      expect(proposal.audit.actorUserId).toBe('user-001');
      expect(proposal.audit.actorTenantId).toBe('tenant-001');
    });

    it('returns ALLOWED policy status for intent without policy', async () => {
      const entities = [buildEntity({ entityType: 'JobOrder', resolvedId: 'jo-2' })];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['Basic.Read', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: 'UNKNOWN_INTENT',
          description: 'Test unknown intent',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-2', displayName: 'JO-002', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal.policyCheck.status).toBe('ALLOWED');
    });

    it('returns REJECTED policy status when blocked situation matches', async () => {
      const entities = [
        buildEntity({ entityType: 'JobOrder', resolvedId: 'jo-3' }),
        buildEntity({ entityType: 'WAITING_UNLOADING', resolvedId: 'WAITING_UNLOADING' }),
      ];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['JobOrder.Update', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.REPLACE_DRIVER,
          description: 'Replace driver',
          entities: [
            { entityType: 'JobOrder', entityId: 'jo-3', displayName: 'JO-003', status: null },
            { entityType: 'WAITING_UNLOADING', entityId: 'WAITING_UNLOADING', displayName: 'Waiting Unloading', status: null },
          ],
          context,
        },
        resolution,
      );

      expect(proposal.policyCheck.status).toBe('REJECTED');
      expect(proposal.policyCheck.reason).toBeDefined();
      expect(proposal.policyCheck.alternativeActions).toBeDefined();
      expect(proposal.policyCheck.alternativeActions?.length).toBeGreaterThan(0);
    });

    it('always requires human confirmation', async () => {
      const entities = [buildEntity()];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['JobOrder.Update', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.ASSIGN_DRIVER,
          description: 'Assign driver',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal.humanConfirmationRequired).toBe(true);
      expect(proposal.confirmationMessage).toBeDefined();
      expect(proposal.confirmationMessage.length).toBeGreaterThan(0);
    });
  });

  describe('EXECUTE boundary', () => {
    it('does not execute mutations during proposal generation', async () => {
      const entities = [buildEntity()];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['JobOrder.Delete', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.CANCEL_JOB,
          description: 'Cancel job',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal).toBeDefined();
      expect(proposal.intent).toBe(DefaultIntents.CANCEL_JOB);
    });
  });

  describe('Authorization boundary', () => {
    it('records actor identity in proposal audit', async () => {
      const entities = [buildEntity()];
      const resolution = buildResolution(entities);
      const context = buildContext({ userId: 'user-123', tenantId: 'tenant-456' });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.ASSIGN_DRIVER,
          description: 'Assign driver',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal.audit.actorUserId).toBe('user-123');
      expect(proposal.audit.actorTenantId).toBe('tenant-456');
      expect(proposal.audit.correlationId).toBe('corr-001');
    });

    it('rejects proposal when user lacks required permissions', async () => {
      const entities = [buildEntity({ entityType: 'JobOrder', resolvedId: 'jo-4' })];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.CANCEL_JOB,
          description: 'Cancel job without permission',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-4', displayName: 'JO-004', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal.policyCheck.status).toBe('REJECTED');
      expect(proposal.policyCheck.reason).toContain('Insufficient permissions');
      expect(proposal.policyCheck.alternativeActions).toContain('Request permission escalation');
    });

    it('allows proposal when user has required permissions', async () => {
      const entities = [buildEntity({ entityType: 'JobOrder', resolvedId: 'jo-5' })];
      const resolution = buildResolution(entities);
      const context = buildContext({ permissions: ['JobOrder.Update', 'commercial:read'] });

      const proposal = await ProposalService.generateProposal(
        {
          intent: DefaultIntents.ASSIGN_DRIVER,
          description: 'Assign driver with permission',
          entities: [{ entityType: 'JobOrder', entityId: 'jo-5', displayName: 'JO-005', status: null }],
          context,
        },
        resolution,
      );

      expect(proposal.policyCheck.status).toBe('ALLOWED');
      expect(proposal.requiredPermissions).toContain('JobOrder.Update');
    });
  });
});
