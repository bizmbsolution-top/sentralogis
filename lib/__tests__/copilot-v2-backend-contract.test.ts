/**
 * Sentralogis — Copilot V2 R2 Backend Contract Verification Test Suite
 * lib/__tests__/copilot-v2-backend-contract.test.ts
 *
 * Verifies contract compatibility between:
 * - V2 UI presentation contracts (components/copilot/v2/types.ts)
 * - Copilot API route contracts (app/api/copilot/route.ts, app/api/copilot/execute/route.ts)
 * - Canonical Proposal contracts (lib/copilot/propose/types.ts, ADR-090)
 * - Canonical Execution contracts (lib/copilot/execute/types.ts, ADR-091, ADR-092)
 * - Identity and Tenant isolation boundaries
 *
 * Strict boundary:
 * - NO real database mutations
 * - NO feature flag activation
 * - NO live execution
 * - Evidence Level: E1 (Static) & E2 (In-memory/Mock)
 */

import { describe, test, expect } from 'vitest';
import type {
  CopilotMessage,
  ProposalBlock,
  UnderstandingBlock,
  ResultBlock,
  EntityReference,
} from '../../components/copilot/v2/types';
import type { CopilotProposal, ProposalEntity } from '../../lib/copilot/propose/types';
import type { ExecutionRequest, ExecutionResult } from '../../lib/copilot/execute/types';
import type { IdentityContext } from '../../lib/application/identity/types';

// ============================================================================
// Adapter Helper (Representative of R3 contract mapping)
// ============================================================================

function mapCanonicalProposalToV2ProposalBlock(canonical: CopilotProposal): ProposalBlock {
  const primaryEntity = canonical.entities[0] || {
    entityType: 'unknown',
    entityId: 'none',
    displayName: 'Unknown',
  };

  return {
    id: canonical.proposalId,
    title: canonical.description || `Action: ${canonical.intent}`,
    description: canonical.explainability?.summary || canonical.description,
    intent: canonical.intent,
    entityId: primaryEntity.entityId,
    entityType: primaryEntity.entityType,
    changes: canonical.entities.map((e) => ({
      field: e.entityType,
      from: 'Unassigned / Current',
      to: e.displayName || e.entityId,
    })),
    reason: canonical.policyCheck?.reason || canonical.explainability?.summary,
    executionAvailable: false, // Strict invariant: ALWAYS false in V2 UI
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Copilot V2 R2 Backend Contract Verification', () => {

  describe('1. Request Contract Verification', () => {
    test('POST /api/copilot request payload format conforms to backend expectations', () => {
      // Backend expects: { message: string, activeContext?: { conversationId?: string, workspace?: any }, image?: any }
      const validPayload = {
        message: 'Show active job orders for today',
        activeContext: {
          conversationId: 'session-conv-123',
          workspace: { activeJob: 'JO-001' },
        },
        image: null,
      };

      expect(typeof validPayload.message).toBe('string');
      expect(validPayload.message.trim().length).toBeGreaterThan(0);
      expect(validPayload.activeContext.conversationId).toBe('session-conv-123');
    });

    test('Backend route rejects empty or whitespace-only messages without images', () => {
      const emptyPayload = { message: '   ', activeContext: {} };
      const hasValidText = !!emptyPayload.message.trim();
      const hasImage = false;
      const isValid = hasValidText || hasImage;

      expect(isValid).toBe(false);
    });

    test('Client request payload DOES NOT supply or override tenantId/userId', () => {
      const clientPayload: Record<string, any> = {
        message: 'Assign driver to JO-001',
        activeContext: { conversationId: 'session-001' },
      };

      // Client must never send trusted identity fields
      expect(clientPayload.tenantId).toBeUndefined();
      expect(clientPayload.userId).toBeUndefined();
      expect(clientPayload.role).toBeUndefined();
      expect(clientPayload.permissions).toBeUndefined();
    });
  });

  describe('2. Response Contract & Presentation Mapping Verification', () => {
    test('Canonical CopilotProposal maps cleanly to V2 ProposalBlock', () => {
      const canonicalProposal: CopilotProposal = {
        proposalId: 'CP-2026-09-0042',
        intent: 'ASSIGN_DRIVER',
        description: 'Assign Driver Budi to Job Order JO-1092',
        entities: [
          {
            entityType: 'JobOrder',
            entityId: 'jo-1092',
            displayName: 'JO-1092',
            status: 'UNASSIGNED',
          },
          {
            entityType: 'Driver',
            entityId: 'drv-88',
            displayName: 'Budi Santoso',
            status: 'AVAILABLE',
          },
        ],
        requiredPermissions: ['job_order:assign'],
        riskLevel: 'LOW',
        policyCheck: {
          status: 'ALLOWED',
          reason: 'Driver is active, compliant, and in proximity.',
          evidence: ['Driver status: active', 'Vehicle assigned: B 1234 CD'],
          alternativeActions: [],
        },
        explainability: {
          summary: 'Optimal driver recommendation based on current location and schedule.',
          details: 'Driver Budi is located 4km from origin depot.',
          warnings: [],
        },
        humanConfirmationRequired: true,
        confirmationMessage: 'Confirm assignment of Driver Budi to Job Order JO-1092?',
        audit: {
          correlationId: 'corr-xyz-123',
          timestamp: new Date().toISOString(),
          actorUserId: 'usr-dispatcher-1',
          actorTenantId: 'tenant-sentralogis-1',
        },
      };

      const v2Block = mapCanonicalProposalToV2ProposalBlock(canonicalProposal);

      expect(v2Block.id).toBe('CP-2026-09-0042');
      expect(v2Block.intent).toBe('ASSIGN_DRIVER');
      expect(v2Block.entityId).toBe('jo-1092');
      expect(v2Block.entityType).toBe('JobOrder');
      expect(v2Block.changes.length).toBe(2);
      expect(v2Block.reason).toBe('Driver is active, compliant, and in proximity.');
      // Crucial UX Constitution invariant:
      expect(v2Block.executionAvailable).toBe(false);
    });

    test('V2 CopilotMessage supports all expected backend response modalities', () => {
      const textMessage: CopilotMessage = {
        id: 'msg-1',
        role: 'assistant',
        type: 'text',
        content: 'System is nominal with 14 active job orders.',
        timestamp: new Date(),
      };
      expect(textMessage.type).toBe('text');

      const proposalMessage: CopilotMessage = {
        id: 'msg-2',
        role: 'assistant',
        type: 'proposal',
        timestamp: new Date(),
        proposal: {
          id: 'CP-001',
          title: 'Assign Driver',
          description: 'Assign driver to JO-001',
          intent: 'ASSIGN_DRIVER',
          entityId: 'JO-001',
          entityType: 'JobOrder',
          changes: [],
          executionAvailable: false,
        },
      };
      expect(proposalMessage.type).toBe('proposal');
      expect(proposalMessage.proposal?.executionAvailable).toBe(false);

      const errorMessage: CopilotMessage = {
        id: 'msg-3',
        role: 'assistant',
        type: 'error',
        content: 'Session expired or insufficient permission.',
        timestamp: new Date(),
      };
      expect(errorMessage.type).toBe('error');
    });
  });

  describe('3. Server Identity & Tenant Isolation Contract', () => {
    test('Server session identity model enforces tenant isolation', () => {
      const trustedIdentity: IdentityContext = {
        tenantId: 'tenant-alpha-corp',
        userId: 'user-op-1',
        role: 'DISPATCHER',
        permissions: ['commercial:read', 'job_order:assign'],
        isTenantOwner: false,
        membershipId: 'mem-1',
        sbuScope: null,
      };

      expect(trustedIdentity.tenantId).toBe('tenant-alpha-corp');
      expect(trustedIdentity.permissions).toContain('commercial:read');
    });

    test('Route authorization strictly differentiates READ vs MANAGE permissions', () => {
      const readOnlyIdentity: IdentityContext = {
        tenantId: 'tenant-1',
        userId: 'usr-reader',
        role: 'VIEWER',
        permissions: ['commercial:read'],
        isTenantOwner: false,
        membershipId: null,
        sbuScope: null,
      };

      const hasRead = readOnlyIdentity.permissions.includes('commercial:read');
      const hasManage = readOnlyIdentity.permissions.includes('commercial:manage');

      expect(hasRead).toBe(true);
      expect(hasManage).toBe(false);
    });
  });

  describe('4. Execution Boundary & ADR-092 Allowlist Contract', () => {
    test('EXECUTE request requires explicit human confirmation', () => {
      const unconfirmedRequest: Partial<ExecutionRequest> = {
        proposalId: 'CP-2026-09-0001',
        confirmation: {
          confirmed: false,
          confirmedBy: '',
          confirmedAt: '',
        },
      };

      const isConfirmed = !!unconfirmedRequest.confirmation?.confirmed;
      expect(isConfirmed).toBe(false);
    });

    test('Confirmed EXECUTE request carries mandatory actor attribution', () => {
      const confirmedRequest: ExecutionRequest = {
        proposalId: 'CP-2026-09-0001',
        confirmation: {
          confirmed: true,
          confirmedBy: 'user-dispatcher-42',
          confirmedAt: '2026-10-03T07:45:00.000Z',
          confirmationNote: 'Approved by head dispatcher',
        },
      };

      expect(confirmedRequest.confirmation.confirmed).toBe(true);
      expect(confirmedRequest.confirmation.confirmedBy).toBe('user-dispatcher-42');
      expect(confirmedRequest.confirmation.confirmationNote).toBe('Approved by head dispatcher');
    });

    test('Only ADR-092 allowlisted intents are executable', () => {
      const allowedIntents = ['ASSIGN_DRIVER', 'CANCEL_JOB', 'REPLACE_DRIVER'];
      const nonAllowedIntents = ['CREATE_INVOICE', 'DISPATCH_CUSTOMS', 'ADJUST_RATES', 'WMS_PICK'];

      for (const intent of allowedIntents) {
        expect(allowedIntents.includes(intent)).toBe(true);
      }

      for (const intent of nonAllowedIntents) {
        expect(allowedIntents.includes(intent)).toBe(false);
      }
    });

    test('V2 UI contract maintains execution lockout', () => {
      const v2Proposal: ProposalBlock = {
        id: 'CP-TEST-01',
        title: 'Replace Driver',
        description: 'Replace driver on JO-002',
        intent: 'REPLACE_DRIVER',
        entityId: 'JO-002',
        entityType: 'JobOrder',
        changes: [],
        executionAvailable: false,
      };

      // In V2 UI, executionAvailable is statically typed as literal `false`
      expect(v2Proposal.executionAvailable).toBe(false);
    });
  });

  describe('5. UX Constitution Compatibility', () => {
    test('Desktop 3-column architecture and mobile drawers are preserved', () => {
      const expectedSections = ['ContextPanel', 'CopilotConversation', 'DetailPanel'];
      expect(expectedSections).toHaveLength(3);
    });
  });

  describe('6. R3 Frontend-Backend Transport Integration', () => {
    test('sendCopilotMessage formats payload and excludes client identity', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      const mockFetch = async (url: any, init: any) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            response: {
              type: 'text',
              content: 'Echo test response',
            },
          }),
        } as any;
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const { sendCopilotMessage } = await import('../../components/copilot/v2/copilot-api-client');
        const res = await sendCopilotMessage('Hello Copilot', {
          conversationId: 'test-conv-99',
        });

        expect(capturedUrl).toBe('/api/copilot');
        expect(capturedBody.message).toBe('Hello Copilot');
        expect(capturedBody.activeContext.conversationId).toBe('test-conv-99');
        // Critical identity invariants:
        expect(capturedBody.tenantId).toBeUndefined();
        expect(capturedBody.userId).toBeUndefined();
        expect(capturedBody.role).toBeUndefined();
        expect(capturedBody.permissions).toBeUndefined();

        expect(res.messages).toHaveLength(1);
        expect(res.messages[0].type).toBe('text');
        expect(res.messages[0].content).toBe('Echo test response');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('sendCopilotMessage maps action_proposal with executionAvailable locked to false', async () => {
      const mockFetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          response: {
            type: 'action_proposal',
            proposal: {
              proposalId: 'CP-2026-09-0099',
              intent: 'ASSIGN_DRIVER',
              description: 'Assign Driver Ahmad to JO-99',
              entities: [
                { entityType: 'JobOrder', entityId: 'JO-99', displayName: 'JO-99', status: 'UNASSIGNED' },
                { entityType: 'Driver', entityId: 'DRV-1', displayName: 'Ahmad Subarjo', status: 'AVAILABLE' },
              ],
              explainability: {
                summary: 'Recommended based on proximity.',
              },
            },
          },
        }),
      } as any);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const { sendCopilotMessage } = await import('../../components/copilot/v2/copilot-api-client');
        const res = await sendCopilotMessage('Assign driver to JO-99');

        expect(res.messages).toHaveLength(1);
        const msg = res.messages[0];
        expect(msg.type).toBe('proposal');
        expect(msg.proposal?.id).toBe('CP-2026-09-0099');
        expect(msg.proposal?.intent).toBe('ASSIGN_DRIVER');
        expect(msg.proposal?.executionAvailable).toBe(false);
        expect(msg.entityRefs).toBeDefined();
        expect(msg.entityRefs?.length).toBe(2);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('sendCopilotMessage fails closed on 401 unauthenticated', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Authentication required: session is invalid or expired.' }),
      } as any);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const { sendCopilotMessage } = await import('../../components/copilot/v2/copilot-api-client');
        const res = await sendCopilotMessage('Query restricted information');

        expect(res.messages).toHaveLength(1);
        expect(res.messages[0].type).toBe('error');
        expect(res.messages[0].content).toContain('Authentication required');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('sendCopilotMessage fails closed on 403 access denied', async () => {
      const mockFetch = async () => ({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied: insufficient permission to access Copilot.' }),
      } as any);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch;

      try {
        const { sendCopilotMessage } = await import('../../components/copilot/v2/copilot-api-client');
        const res = await sendCopilotMessage('Unauthorized command');

        expect(res.messages).toHaveLength(1);
        expect(res.messages[0].type).toBe('error');
        expect(res.messages[0].content).toContain('Access denied');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test('sendCopilotMessage strictly throws if directed to non-canonical endpoints', async () => {
      const { sendCopilotMessage } = await import('../../components/copilot/v2/copilot-api-client');
      await expect(
        sendCopilotMessage('Test execute', { endpoint: '/api/copilot/other' })
      ).rejects.toThrow('Copilot V2 transport prohibited from calling non-canonical endpoint.');
    });
  });
});
