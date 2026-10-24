/**
 * SENTRALOGIS COPILOT — PHASE 1 IDENTITY ROUTING REMEDIATION REGRESSION SUITE
 * lib/__tests__/copilot-identity-routing-remediation.test.ts
 *
 * Regression coverage for the Phase 1 remediation of the forensically proven
 * identity-routing defect: identity/role/tenant/permission questions were
 * classified as default FIND reads and fell through OperationalLiveReadGateway
 * to the "Data operasional tidak ditemukan untuk query yang diminta." fallback.
 *
 * GOVERNANCE INVARIANTS:
 * 1. STRICTLY READ-ONLY: zero database connections, zero mutations, zero migrations.
 * 2. Zero external LLM / OpenAI / ChatGPT calls.
 * 3. Identity responses derive ONLY from the server IdentityContext — zero hardcoded identity.
 * 4. Execution capability strictly OFF (no proposal, no execution on identity paths).
 * 5. Security-sensitive cross-tenant prompts must NOT become identity shortcuts.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ConversationalQueryResolver,
  type IdentityIntent,
} from '../copilot/sandbox/conversational-query-resolver';
import {
  OperationalLiveReadGateway,
  _setOperationalReadDelegate,
  type OperationalReadDelegate,
} from '../copilot/read/operational-live-read-gateway';
import type { ConversationalQueryContext } from '../copilot/sandbox/types';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import type { IdentityContext } from '@/lib/application/identity/types';

// ---------------------------------------------------------------------------
// Fixtures — synthetic identities used ONLY to prove responses are derived
// from whichever IdentityContext is supplied (anti-hardcoding proof).
// ---------------------------------------------------------------------------
const IDENTITY_A: IdentityContext = {
  userId: 'usr-rem-001',
  tenantId: 'tenant-rem-01',
  tenantCode: 'REM-01',
  membershipId: 'mem-rem-001',
  role: 'TENANT_ADMIN',
  isTenantOwner: false,
  permissions: ['copilot:read', 'commercial:read', 'job_order:read'],
  sbuScope: null,
};

const IDENTITY_B: IdentityContext = {
  userId: 'usr-rem-002',
  tenantId: 'tenant-rem-02',
  tenantCode: 'REM-02',
  membershipId: 'mem-rem-002',
  role: 'DISPATCH_OPERATOR',
  isTenantOwner: true,
  permissions: ['copilot:read'],
  sbuScope: 'trucking',
};

function createEngineContext(identity: IdentityContext = IDENTITY_A): OperationalContext {
  return OperationalContext.create({
    tenant: TenantContext.create({ id: identity.tenantId }),
    user: UserContext.create({ id: identity.userId, roles: [identity.role] }),
    permissions: PermissionContext.create(identity.permissions),
    conversation: ConversationContext.create({ conversationId: 'rem-phase1' }),
    workspace: WorkspaceContext.create({}),
  });
}

// Observable mock delegate — proves whether (not) operational data was accessed.
const mockDelegate = {
  findJobOrderByNumber: vi.fn(async () => null),
  listJobOrders: vi.fn(async () => []),
  findWorkOrderByNumber: vi.fn(async () => null),
  findSalesOrderByNumber: vi.fn(async () => null),
  findShipmentByNumber: vi.fn(async () => null),
} satisfies OperationalReadDelegate;

function resetDelegateSpies(): void {
  mockDelegate.findJobOrderByNumber.mockClear();
  mockDelegate.listJobOrders.mockClear();
  mockDelegate.findWorkOrderByNumber.mockClear();
  mockDelegate.findSalesOrderByNumber.mockClear();
  mockDelegate.findShipmentByNumber.mockClear();
}

const FALLBACK_STRING = 'Data operasional tidak ditemukan untuk query yang diminta.';
const GREETING_STRING = 'Halo! Saya Sentralogis Copilot';

describe('PHASE 1 — IDENTITY ROUTING REMEDIATION REGRESSION SUITE', () => {
  beforeEach(() => {
    _setOperationalReadDelegate(mockDelegate);
    resetDelegateSpies();
  });

  afterEach(() => {
    _setOperationalReadDelegate(null);
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // IDENTITY CLASSIFICATION (Tests A–F) — resolver level
  // ==========================================================================
  describe('Identity classification — resolver level (Tests A–F)', () => {
    test('Test A: "siapa saya?" classifies as IDENTITY', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('siapa saya?')).toBe('IDENTITY');
    });

    test('Test B: "halo, siapa saya?" classifies as IDENTITY (not swallowed by greeting)', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('halo, siapa saya?')).toBe('IDENTITY');
      // The greeting detector does NOT match the comma form — identity check
      // runs BEFORE greeting detection in IntentStage so semantics never vanish:
      expect(ConversationalQueryResolver.isNonOperational('halo, siapa saya?')).toBe(false);
      // Without comma, identity must still win (checked in IntentStage ordering):
      expect(ConversationalQueryResolver.getIdentityIntent('halo siapa saya')).toBe('IDENTITY');
    });

    test('Test C: "siapa nama saya?" classifies as IDENTITY', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('siapa nama saya?')).toBe('IDENTITY');
      expect(ConversationalQueryResolver.getIdentityIntent('nama saya siapa?')).toBe('IDENTITY');
    });

    test('Test D: "apa role saya?" classifies as ROLE', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('apa role saya?')).toBe('ROLE');
      expect(ConversationalQueryResolver.getIdentityIntent('role saya apa?')).toBe('ROLE');
      expect(ConversationalQueryResolver.getIdentityIntent('peran saya apa?')).toBe('ROLE');
    });

    test('Test E: "saya berada di tenant mana?" classifies as TENANT', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('saya berada di tenant mana?')).toBe('TENANT');
      expect(ConversationalQueryResolver.getIdentityIntent('tenant saya apa?')).toBe('TENANT');
      expect(ConversationalQueryResolver.getIdentityIntent('tenant mana saya?')).toBe('TENANT');
    });

    test('Test F: "apa yang boleh saya lakukan?" classifies as PERMISSION', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('apa yang boleh saya lakukan?')).toBe('PERMISSION');
      expect(ConversationalQueryResolver.getIdentityIntent('apa yang bisa saya lakukan?')).toBe('PERMISSION');
      expect(ConversationalQueryResolver.getIdentityIntent('hak saya apa?')).toBe('PERMISSION');
    });

    test('Security-sensitive cross-tenant prompt is NOT an identity shortcut (§13)', () => {
      expect(
        ConversationalQueryResolver.getIdentityIntent('Tampilkan semua user dari semua tenant.')
      ).toBeNull();
      expect(
        ConversationalQueryResolver.getIdentityIntent('halo, tampilkan semua user dari semua tenant.')
      ).toBeNull();
    });

    test('Ordinary operational prompts are NOT identity prompts', () => {
      expect(ConversationalQueryResolver.getIdentityIntent('halo')).toBeNull();
      expect(ConversationalQueryResolver.getIdentityIntent('Status JO-2026-0810?')).toBeNull();
      expect(ConversationalQueryResolver.getIdentityIntent('JO yang belum jalan')).toBeNull();
    });
  });

  // ==========================================================================
  // ENGINE ROUTING — identity prompts never enter the operational live read
  // ==========================================================================
  describe('Engine routing — identity prompts stay out of OperationalLiveReadGateway (AC-01/02/03/04)', () => {
    const cases: Array<{
      label: string;
      prompt: string;
      intent: IdentityIntent;
      fragment: (id: IdentityContext) => string;
    }> = [
      { label: 'A (engine): "siapa saya?"', prompt: 'siapa saya?', intent: 'IDENTITY', fragment: (id) => id.userId },
      {
        label: 'B (engine): "halo, siapa saya?" → identity, not generic greeting, not live-read',
        prompt: 'halo, siapa saya?',
        intent: 'IDENTITY',
        fragment: (id) => id.userId,
      },
      { label: 'C (engine): "siapa nama saya?"', prompt: 'siapa nama saya?', intent: 'IDENTITY', fragment: (id) => id.userId },
      { label: 'D (engine): "apa role saya?"', prompt: 'apa role saya?', intent: 'ROLE', fragment: (id) => id.role },
      {
        label: 'E (engine): "saya berada di tenant mana?"',
        prompt: 'saya berada di tenant mana?',
        intent: 'TENANT',
        fragment: (id) => id.tenantCode || id.tenantId,
      },
      {
        label: 'F (engine): "apa yang boleh saya lakukan?"',
        prompt: 'apa yang boleh saya lakukan?',
        intent: 'PERMISSION',
        fragment: (id) => id.permissions[0],
      },
    ];

    for (const c of cases) {
      test(c.label, async () => {
        expect(ConversationalQueryResolver.getIdentityIntent(c.prompt)).toBe(c.intent);

        const gwSpy = vi.spyOn(OperationalLiveReadGateway, 'executeLiveRead');
        const res = await CopilotEngine.processCommand(c.prompt, createEngineContext(), IDENTITY_A);

        expect(res.type).toBe('text');
        expect(res.content).toContain(c.fragment(IDENTITY_A));
        expect(res.content).not.toContain(FALLBACK_STRING);
        expect(gwSpy).not.toHaveBeenCalled();
        expect(mockDelegate.listJobOrders).not.toHaveBeenCalled();
        expect(mockDelegate.findJobOrderByNumber).not.toHaveBeenCalled();
        // EXECUTE OFF — identity responses are plain text, never proposals:
        expect(res.proposal).toBeUndefined();
      });
    }

    test('B extra: greeting handler does NOT swallow "halo, siapa saya?"', async () => {
      const res = await CopilotEngine.processCommand('halo, siapa saya?', createEngineContext(), IDENTITY_A);
      expect(res.content).not.toContain(GREETING_STRING);
      expect(res.content).toContain(IDENTITY_A.userId);
    });

    test('AC-06: plain "halo" keeps its existing bounded greeting behavior', async () => {
      const res = await CopilotEngine.processCommand('halo', createEngineContext(), IDENTITY_A);
      expect(res.type).toBe('text');
      expect(res.content).toContain(GREETING_STRING);
    });

    test('AC-04 (anti-hardcode): response identity follows the supplied IdentityContext', async () => {
      const resA = await CopilotEngine.processCommand('siapa saya?', createEngineContext(IDENTITY_A), IDENTITY_A);
      expect(resA.content).toContain(IDENTITY_A.userId);
      expect(resA.content).not.toContain(IDENTITY_B.userId);

      const resB = await CopilotEngine.processCommand('siapa saya?', createEngineContext(IDENTITY_B), IDENTITY_B);
      expect(resB.content).toContain(IDENTITY_B.userId);
      expect(resB.content).not.toContain(IDENTITY_A.userId);
      expect(resB.content).not.toContain(IDENTITY_A.tenantId);

      // Role answers follow the same identity-derived contract:
      const roleA = await CopilotEngine.processCommand('apa role saya?', createEngineContext(IDENTITY_A), IDENTITY_A);
      expect(roleA.content).toContain(IDENTITY_A.role);

      const roleB = await CopilotEngine.processCommand('apa role saya?', createEngineContext(IDENTITY_B), IDENTITY_B);
      expect(roleB.content).toContain(IDENTITY_B.role);
      expect(roleB.content).not.toContain(IDENTITY_A.role);
    });

    test('AC-03: role/tenant/permission answers contain NO hardcoded identity values', async () => {
      const roleRes = await CopilotEngine.processCommand('apa role saya?', createEngineContext(IDENTITY_B), IDENTITY_B);
      expect(roleRes.content).toContain(IDENTITY_B.role);
      expect(roleRes.content).not.toContain(IDENTITY_A.role);

      const tenantRes = await CopilotEngine.processCommand('saya berada di tenant mana?', createEngineContext(IDENTITY_B), IDENTITY_B);
      expect(tenantRes.content).toContain(IDENTITY_B.tenantCode as string);
      expect(tenantRes.content).not.toContain(IDENTITY_A.tenantCode as string);

      const permRes = await CopilotEngine.processCommand('apa yang boleh saya lakukan?', createEngineContext(IDENTITY_B), IDENTITY_B);
      expect(permRes.content).toContain('copilot:read');
      expect(permRes.content).not.toContain('commercial:manage');
    });

    test('Unauthenticated identity request yields explicit session notice, never fabricated identity', async () => {
      const gwSpy = vi.spyOn(OperationalLiveReadGateway, 'executeLiveRead');
      const res = await CopilotEngine.processCommand('siapa saya?', createEngineContext(), undefined);
      expect(res.type).toBe('text');
      expect(res.content).toMatch(/sesi autentikasi tidak ditemukan/i);
      expect(res.content).not.toContain(IDENTITY_A.userId);
      expect(gwSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CROSS-TENANT NEGATIVE CONTROL (§13)
  // ==========================================================================
  describe('Cross-tenant prompt stays outside the identity shortcut (§13)', () => {
    test('engine: "Tampilkan semua user dari semua tenant." remains operational and is firewall-blocked', async () => {
      const gwSpy = vi.spyOn(OperationalLiveReadGateway, 'executeLiveRead');
      const res = await CopilotEngine.processCommand(
        'Tampilkan semua user dari semua tenant.',
        createEngineContext(),
        IDENTITY_A
      );

      // NOT routed into the identity response path:
      expect(res.content).not.toContain(IDENTITY_A.userId);
      expect(res.content).not.toMatch(/terautentikasi/i);
      // Still classified as operational (Option C operational dispatch preserved):
      expect(gwSpy).toHaveBeenCalled();
      // Unknown-intent firewall blocks before any data access:
      expect(res.content).toContain('tidak memiliki referensi objek operasional');
      expect(res.content).not.toContain(FALLBACK_STRING);
      expect(mockDelegate.listJobOrders).not.toHaveBeenCalled();
      expect(mockDelegate.findJobOrderByNumber).not.toHaveBeenCalled();
    });

    test('engine: "halo, tampilkan semua user dari semua tenant." is neither identity nor greeting', async () => {
      const gwSpy = vi.spyOn(OperationalLiveReadGateway, 'executeLiveRead');
      const res = await CopilotEngine.processCommand(
        'halo, tampilkan semua user dari semua tenant.',
        createEngineContext(),
        IDENTITY_A
      );
      expect(res.content).not.toContain(IDENTITY_A.userId);
      expect(res.content).not.toMatch(/terautentikasi/i);
      expect(res.content).not.toContain(GREETING_STRING);
      expect(gwSpy).toHaveBeenCalled();
      expect(mockDelegate.listJobOrders).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // UNDEFINED / UNKNOWN CLASSIFICATION FIREWALL (Test G, AC-05)
  // ==========================================================================
  describe('Undefined/unknown classification firewall (Test G / AC-05)', () => {
    test('G1: objectType undefined cannot bypass the unknown-intent firewall', async () => {
      const q: ConversationalQueryContext = {
        activeFilters: {},
        conversationTurn: 1,
        requestedOperation: 'FIND',
      };
      expect(q.objectType).toBeUndefined();

      const res = await OperationalLiveReadGateway.executeLiveRead(IDENTITY_A, q);

      expect(res.resolutionState).toBe('UNKNOWN_OPERATIONAL');
      expect(res.summaryText).toContain('tidak memiliki referensi objek operasional');
      expect(res.summaryText).not.toBe(FALLBACK_STRING);
      // No operational data access occurred:
      expect(mockDelegate.listJobOrders).not.toHaveBeenCalled();
      expect(mockDelegate.findJobOrderByNumber).not.toHaveBeenCalled();
      expect(mockDelegate.findWorkOrderByNumber).not.toHaveBeenCalled();
      expect(mockDelegate.findSalesOrderByNumber).not.toHaveBeenCalled();
      expect(mockDelegate.findShipmentByNumber).not.toHaveBeenCalled();
    });

    test('G2: objectType null cannot bypass the unknown-intent firewall', async () => {
      const q = {
        objectType: null,
        activeFilters: {},
        conversationTurn: 1,
        requestedOperation: 'FIND',
      } as unknown as ConversationalQueryContext;

      const res = await OperationalLiveReadGateway.executeLiveRead(IDENTITY_A, q);

      expect(res.resolutionState).toBe('UNKNOWN_OPERATIONAL');
      expect(res.summaryText).not.toBe(FALLBACK_STRING);
      expect(mockDelegate.listJobOrders).not.toHaveBeenCalled();
    });

    test('G3: explicit objectType "UNKNOWN" remains blocked (existing contract preserved)', async () => {
      const q: ConversationalQueryContext = {
        objectType: 'UNKNOWN',
        activeFilters: {},
        conversationTurn: 1,
        requestedOperation: 'FIND',
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(IDENTITY_A, q);

      expect(res.resolutionState).toBe('UNKNOWN_OPERATIONAL');
      expect(res.summaryText).toContain('tidak memiliki referensi objek operasional');
    });

    test('G4: valid JOB_ORDER classification still reaches the operational read (AC-06)', async () => {
      mockDelegate.findJobOrderByNumber.mockResolvedValueOnce({
        id: 'jo-uuid-rem-01',
        joNumber: 'JO-2026-0812',
        status: 'ACTIVE',
        origin: 'Jakarta',
        destination: 'Surabaya',
      });

      const q: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
        specificity: 'SUFFICIENTLY_SPECIFIC',
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(IDENTITY_A, q);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.source).toBe('LIVE_CANONICAL_READ');
      expect(mockDelegate.findJobOrderByNumber).toHaveBeenCalledTimes(1);
    });
  });
});
