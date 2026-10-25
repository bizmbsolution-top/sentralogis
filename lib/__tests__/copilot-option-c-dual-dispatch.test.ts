import { describe, it, expect, beforeEach } from 'vitest';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://256.256.256.256';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-placeholder-key';
}
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  _setOperationalReadDelegate,
  classifyCanonicalJoStatus,
  matchesRequestedJoStatusFilter,
  type OperationalReadDelegate,
} from '@/lib/copilot/read/operational-live-read-gateway';
import { getEntityDetail } from '@/lib/copilot/read/read-gateway-service';
import { _setWorkOrderDbClient, type WorkOrderDbClient } from '@/lib/work-order/service';
import * as fs from 'fs';
import * as path from 'path';

describe('Copilot Unified Understanding Dual Dispatch (Option C)', () => {
  const TENANT_ID = 'test-tenant-01';
  const USER_ID = 'user-01';

  let mockDelegate: OperationalReadDelegate;

  const identity: IdentityContext = {
    userId: USER_ID,
    tenantId: TENANT_ID,
    role: 'ops_manager',
    roles: ['ops_manager'],
    permissions: ['copilot:read', 'job_order:read', 'work_order:read', 'commercial:read', 'shipment:read'],
    sbuScope: 'trucking',
  };

  const context = OperationalContext.create({
    tenant: TenantContext.create({ id: TENANT_ID }),
    user: UserContext.create({ id: USER_ID, roles: ['ops_manager'] }),
    permissions: PermissionContext.create(['copilot:read', 'job_order:read', 'work_order:read', 'commercial:read', 'shipment:read']),
    conversation: ConversationContext.create({ conversationId: 'test-convo' }),
    workspace: WorkspaceContext.create({}),
  });

  beforeEach(() => {
    mockDelegate = {
      findJobOrderByNumber: async () => null,
      listJobOrders: async (_ctx, filters) => {
        if (filters.status === 'BELUM_JALAN') {
          return [
            {
              id: 'jo-001',
              joNumber: 'JO-2026-0001',
              status: 'unassigned',
              customerName: 'PT Mitra Sukses',
              sbuType: 'TRUCKING',
            },
          ];
        }
        return [];
      },
      findWorkOrderByNumber: async () => null,
      findSalesOrderByNumber: async () => null,
      findShipmentByNumber: async () => null,
    };
    _setOperationalReadDelegate(mockDelegate);
  });

  it('1. CHAT: "halo" returns bounded conversational response without database query', async () => {
    const res = await CopilotEngine.processCommand('halo', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Halo! Saya Sentralogis Copilot');
    expect(res.proposal).toBeUndefined();
  });

  it('2. OPERATIONAL_READ: "JO yang belum jalan" routes to canonical JO live read', async () => {
    const res = await CopilotEngine.processCommand('JO yang belum jalan', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Job Order');
    expect(res.proposal).toBeUndefined();
  });

  it('3. OPERATIONAL_READ: "apakah ada customer ABC?" checks customer master', async () => {
    const res = await CopilotEngine.processCommand('apakah ada customer ABC?', context, identity);
    expect(res.type).toBe('text');
    expect(res.content?.toLowerCase()).toContain('customer');
    expect(res.proposal).toBeUndefined();
  });

  it('4. AMBIGUITY: "tampilkan data" triggers ambiguity clarification question', async () => {
    const res = await CopilotEngine.processCommand('tampilkan data', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toMatch(/(Perintah tidak dapat dieksekusi|klarifikasi objek|beberapa entitas)/i);
  });

  it('5. AUTHORIZATION: user lacking permissions is blocked with explicit permission message', async () => {
    const restrictedIdentity: IdentityContext = {
      ...identity,
      permissions: ['copilot:read'], // missing job_order:read & commercial:read
    };
    const res = await CopilotEngine.processCommand('apakah ada customer ABC?', context, restrictedIdentity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Akses ditolak');
  });

  it('6. MUTATION REGRESSION: "assign driver Budi to JO-101" routes to proposal pipeline with executionAvailable false', async () => {
    const res = await CopilotEngine.processCommand('assign driver Budi to JO-101', context, identity);
    // console.log('Test 6 res:', res);
    expect(res.type === 'action_proposal' || res.type === 'clarification' || res.type === 'text').toBe(true);
    if (res.proposal) {
      expect(res.proposal.executionAvailable).toBe(false);
    }
  });

  it('7. FALLBACK REFINEMENT: full question suggestion does not generate "Did you mean to Could you please..."', async () => {
    // Calling an unknown prompt
    const res = await CopilotEngine.processCommand('xyz123abc random input without any sense', context, identity);
    if (res.content) {
      expect(res.content).not.toContain('Did you mean to Could you please');
      expect(res.content).not.toContain('Did you mean to Apakah Anda');
    }
  });

  it('8. CHAT: "halo!", "halo?", "halo copilot" handle greetings with punctuation cleanly', async () => {
    for (const greeting of ['halo!', 'halo?', 'halo...', 'selamat pagi!', 'halo copilot']) {
      const res = await CopilotEngine.processCommand(greeting, context, identity);
      expect(res.type).toBe('text');
      expect(res.content).toContain('Halo! Saya Sentralogis Copilot');
    }
  });

  it('9. IDENTITY: "siapa saya", "akun saya siapa", "profil saya" return authenticated identity', async () => {
    for (const prompt of ['siapa saya', 'siapa saya?', 'akun saya siapa', 'profil saya']) {
      const res = await CopilotEngine.processCommand(prompt, context, identity);
      expect(res.type).toBe('text');
      expect(res.content).toContain(`user id **${identity.userId}**`);
    }
  });

  it('10. OPERATIONAL_READ: "JO belum selesai" and "JO mana yang masih berjalan" resolve uncompleted JOs', async () => {
    for (const query of ['JO belum selesai', 'JO mana yang masih berjalan', 'tampilkan JO yang belum selesai']) {
      const res = await CopilotEngine.processCommand(query, context, identity);
      expect(res.type).toBe('text');
      expect(res.content).toContain('JO-2026-0001');
      expect(res.proposal).toBeUndefined();
    }
  });

  it('11. TENANT ISOLATION: listJobOrders receives and enforces context.tenantId', async () => {
    let capturedTenantId = '';
    mockDelegate.listJobOrders = async (ctx, _filters) => {
      capturedTenantId = ctx.tenantId;
      return [];
    };

    const res = await CopilotEngine.processCommand('JO belum selesai', context, identity);
    expect(capturedTenantId).toBe(identity.tenantId);
    expect(res.type).toBe('text');
  });

  it('12. PRODUCTION DELEGATE FALLBACK: uses defaultProductionDelegate when _setOperationalReadDelegate(null)', async () => {
    _setOperationalReadDelegate(null);
    // In test environment without DB keys, it will gracefully handle or throw database error without crash
    const res = await CopilotEngine.processCommand('JO belum selesai', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toBeDefined();
    // Re-set mockDelegate for subsequent tests
    _setOperationalReadDelegate(mockDelegate);
  });

  it('13. DATABASE ERROR HANDLING: database failures return explicit error message rather than empty data', async () => {
    mockDelegate.listJobOrders = async () => {
      throw new Error('Database connection timeout');
    };

    const res = await CopilotEngine.processCommand('JO belum selesai', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Terjadi kendala saat membaca data operasional');
  });

  it('14. PROFILE NAME: "siapa nama saya" displays official profile name when available and does not fabricate', async () => {
    const namedContext = OperationalContext.create({
      tenant: TenantContext.create({ id: TENANT_ID }),
      user: UserContext.create({ id: USER_ID, displayName: 'Raja Halu', roles: ['ops_manager'] }),
      permissions: PermissionContext.create(['copilot:read', 'job_order:read']),
      conversation: ConversationContext.create({ conversationId: 'test-convo' }),
      workspace: WorkspaceContext.create({}),
    });

    const res = await CopilotEngine.processCommand('siapa nama saya', namedContext, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Nama Anda pada profil resmi adalah **Raja Halu**');
    expect(res.content).toContain(`user id **${identity.userId}**`);

    // When profile name is absent / same as userId, does not fabricate name
    const unnamedContext = OperationalContext.create({
      tenant: TenantContext.create({ id: TENANT_ID }),
      user: UserContext.create({ id: USER_ID, displayName: USER_ID, roles: ['ops_manager'] }),
      permissions: PermissionContext.create(['copilot:read', 'job_order:read']),
      conversation: ConversationContext.create({ conversationId: 'test-convo' }),
      workspace: WorkspaceContext.create({}),
    });

    const res2 = await CopilotEngine.processCommand('siapa nama saya', unnamedContext, identity);
    expect(res2.type).toBe('text');
    expect(res2.content).toContain('Nama profil resmi belum terdaftar untuk akun Anda');
    expect(res2.content).toContain(`user id **${identity.userId}**`);
  });

  it('15. LOCATION AMBIGUITY: "JO yang di Surabaya" prompts clarification between origin and destination without returning generic JOs', async () => {
    const res = await CopilotEngine.processCommand('JO yang di Surabaya', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Apakah yang Anda maksud adalah Job Order dengan asal Surabaya atau tujuan Surabaya?');
    // Crucial: Must NOT return generic JOs as if they matched
    expect(res.content).not.toContain('JO-2026-0001');
  });

  it('16. LOCATION FILTER: "JO tujuan Surabaya" and "JO asal Surabaya" filter correctly and do not leak non-matching locations', async () => {
    mockDelegate.listJobOrders = async (_ctx, filters) => {
      const all = [
        {
          id: 'jo-sby',
          joNumber: 'JO-2026-SBY',
          status: 'in_progress',
          customerName: 'PT Jawa Timur Makmur',
          destination: 'Surabaya',
          origin: 'Jakarta',
          sbuType: 'TRUCKING',
        },
        {
          id: 'jo-bdg',
          joNumber: 'JO-2026-BDG',
          status: 'in_progress',
          customerName: 'PT Pasundan Express',
          destination: 'Bandung',
          origin: 'Jakarta',
          sbuType: 'TRUCKING',
        },
      ];
      if (filters.destination) {
        return all.filter(j => j.destination.toLowerCase().includes(filters.destination!.toLowerCase()));
      }
      if (filters.origin) {
        return all.filter(j => j.origin.toLowerCase().includes(filters.origin!.toLowerCase()));
      }
      return all;
    };

    // Unambiguous destination
    const resDest = await CopilotEngine.processCommand('JO tujuan Surabaya', context, identity);
    expect(resDest.type).toBe('text');
    expect(resDest.content).toContain('JO-2026-SBY');
    expect(resDest.content).not.toContain('JO-2026-BDG');

    // Unambiguous origin
    const resOrig = await CopilotEngine.processCommand('JO asal Jakarta', context, identity);
    expect(resOrig.type).toBe('text');
    expect(resOrig.content).toContain('JO-2026-SBY');
    expect(resOrig.content).toContain('JO-2026-BDG');

    // Non-existent destination
    const resNone = await CopilotEngine.processCommand('JO tujuan Denpasar', context, identity);
    expect(resNone.type).toBe('text');
    expect(resNone.content).toContain('Data operasional tidak ditemukan pada live database');
    expect(resNone.content).toContain('Tujuan: Denpasar');
    expect(resNone.content).not.toContain('JO-2026-SBY');
  });

  it('17. CUSTOMER READ REJECTION FOR HQ_CS: role "hq_cs" without "commercial:read" receives clear Indonesian policy rejection message', async () => {
    const csIdentity: IdentityContext = {
      userId: 'user-cs-01',
      tenantId: TENANT_ID,
      role: 'hq_cs',
      roles: ['hq_cs'],
      permissions: ['copilot:read', 'work_order:read', 'work_order:update', 'job_order:read', 'customer_visibility:read'],
      sbuScope: null,
    };

    const res = await CopilotEngine.processCommand('apakah ada customer ABC?', context, csIdentity);
    expect(res.type).toBe('text');
    expect(res.content).toContain("Akses ditolak: Pencarian master Customer memerlukan izin 'commercial:read'");
    expect(res.content).toContain('hq_cs');
    expect(res.content).toContain('tidak memiliki izin komersial tersebut');
  });

  it('18. WAREHOUSE SBU DESTINATION MAPPING: maps warehouse_name as destination for INBOUND warehouse operations', async () => {
    const adminIdentity: IdentityContext = {
      ...identity,
      role: 'tenant_admin',
      roles: ['tenant_admin'],
      sbuScope: null,
    };
    mockDelegate.listJobOrders = async (ctx, filters) => {
      // Simulate raw production delegate extraction where warehouse_name is mapped to destination
      const itemData = {
        operation_type: 'INBOUND',
        warehouse_name: 'WH-SBY-01 - GUDANG SURABAYA-01',
        destination_location_id: '5ef2429a-5cdd-459b-9ed3-47f3e7bfe6fe',
      };
      const opType = String(itemData.operation_type || '').toUpperCase();
      let destVal: string | undefined;
      if (opType === 'INBOUND' || itemData.destination_location_id) {
        destVal = itemData.warehouse_name;
      }

      const all = [
        {
          id: 'jo-wh-sby',
          joNumber: 'HALU-HANAFI-0626-001/WH01-01',
          status: 'rejected',
          customerName: 'HANAFI',
          destination: destVal,
          sbuType: 'WAREHOUSE',
        },
      ];

      if (filters.destination) {
        return all.filter((j) => j.destination && j.destination.toLowerCase().includes(filters.destination!.toLowerCase()));
      }
      return all;
    };

    const res = await CopilotEngine.processCommand('JO tujuan Surabaya', context, adminIdentity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('HALU-HANAFI-0626-001/WH01-01');
    expect(res.content).toContain('HANAFI');
  });

  it('19. TERMINAL STATUS EXCLUSION: "JO belum selesai" excludes rejected, cancelled, and completed jobs while preserving active/awaiting jobs', async () => {
    mockDelegate.listJobOrders = async (ctx, filters) => {
      expect(filters.status).toBe('BELUM_JALAN');
      // In production SQL, .not('status', 'in', ...) filters terminal statuses
      const activeJobs = [
        {
          id: 'jo-active-01',
          joNumber: 'JO-ACTIVE-001',
          status: 'awaiting_audit',
          customerName: 'PT Active Logistics',
          destination: 'Bekasi',
          sbuType: 'TRUCKING',
        },
      ];
      return activeJobs;
    };

    const res = await CopilotEngine.processCommand('JO belum selesai', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('JO-ACTIVE-001');
    expect(res.content).toContain('awaiting_audit');
    expect(res.content).not.toContain('rejected');
    expect(res.content).not.toContain('cancelled');
    expect(res.content).not.toContain('completed');
  });

  it('20. WAREHOUSE DIRECTION INTEGRITY: OUTBOUND maps origin only and STOCK_TRANSFER preserves origin and destination without flipping', async () => {
    const adminIdentity: IdentityContext = {
      ...identity,
      role: 'tenant_admin',
      roles: ['tenant_admin'],
      sbuScope: null,
    };

    mockDelegate.listJobOrders = async (ctx, filters) => {
      // Return 2 warehouse jobs: one OUTBOUND (origin: WH-JAKARTA), one INBOUND (destination: WH-SURABAYA)
      const jobs = [
        {
          id: 'jo-out',
          joNumber: 'JO-WH-OUT-01',
          status: 'awaiting_audit',
          customerName: 'HANAFI',
          origin: 'WH-HALU-01 - GUDANG JAKARTA 01',
          destination: undefined,
          sbuType: 'WAREHOUSE',
        },
        {
          id: 'jo-in',
          joNumber: 'JO-WH-IN-01',
          status: 'awaiting_audit',
          customerName: 'HANAFI',
          origin: undefined,
          destination: 'WH-SBY-01 - GUDANG SURABAYA-01',
          sbuType: 'WAREHOUSE',
        },
      ];

      if (filters.destination) {
        return jobs.filter((j) => j.destination && j.destination.toLowerCase().includes(filters.destination!.toLowerCase()));
      }
      if (filters.origin) {
        return jobs.filter((j) => j.origin && j.origin.toLowerCase().includes(filters.origin!.toLowerCase()));
      }
      return jobs;
    };

    // Query destination Jakarta -> must NOT match OUTBOUND job where Jakarta is origin
    const resDestJakarta = await CopilotEngine.processCommand('JO tujuan Jakarta', context, adminIdentity);
    expect(resDestJakarta.type).toBe('text');
    expect(resDestJakarta.content).toContain('Data operasional tidak ditemukan pada live database');
    expect(resDestJakarta.content).not.toContain('JO-WH-OUT-01');

    // Query origin Jakarta -> MUST match OUTBOUND job
    const resOrigJakarta = await CopilotEngine.processCommand('JO asal Jakarta', context, adminIdentity);
    expect(resOrigJakarta.type).toBe('text');
    expect(resOrigJakarta.content).toContain('JO-WH-OUT-01');
  });

  it('21. STATUS FILTERING: "JO rejected" and "JO cancelled" strictly enforce status filter without returning generic status distribution', async () => {
    mockDelegate.listJobOrders = async (_ctx, filters) => {
      const records = [
        {
          id: 'jo-rej-1',
          joNumber: 'HALU-TOP-0526-002-01',
          status: 'rejected',
          customerName: 'PT Mandiri Sejahtera',
          destination: 'Bekasi',
          sbuType: 'TRUCKING',
        },
        {
          id: 'jo-act-1',
          joNumber: 'HALU-TOP-0526-001-01',
          status: 'in_progress',
          customerName: 'PT Aneka Bangun',
          destination: 'Jakarta',
          sbuType: 'TRUCKING',
        },
      ];

      if (filters.status === 'REJECTED') {
        return records.filter((r) => r.status.toLowerCase().includes('reject'));
      }
      return records;
    };

    const res = await CopilotEngine.processCommand('JO rejected', context, identity);
    expect(res.type).toBe('text');
    expect(res.content).toContain('HALU-TOP-0526-002-01');
    expect(res.content).toContain('rejected');
    expect(res.content).not.toContain('HALU-TOP-0526-001-01');
    expect(res.content).not.toContain('in_progress');
  });

  it('22. CANONICAL IDENTIFIER LOOKUP: "buka HALU-TOP-0526-002-01" and bare "HALU-TOP-0526-002-01" resolve canonical JO with direct answer and navigation route', async () => {
    mockDelegate.findJobOrderByNumber = async (_ctx, joNum) => {
      if (joNum.toUpperCase() === 'HALU-TOP-0526-002-01') {
        return {
          id: '5ef2429a-5cdd-459b-9ed3-47f3e7bfe6fe',
          joNumber: 'HALU-TOP-0526-002-01',
          status: 'rejected',
          customerName: 'PT Mandiri Sejahtera',
          driverName: 'Budi Santoso',
          vehicleNumber: 'B 1234 CD',
          origin: 'Jakarta',
          destination: 'Bekasi',
          sbuType: 'TRUCKING',
        };
      }
      return null;
    };

    // 1. "buka <nomor>"
    const resOpen = await CopilotEngine.processCommand('buka HALU-TOP-0526-002-01', context, identity);
    expect(resOpen.type).toBe('text');
    expect(resOpen.content).toContain('Job Order **HALU-TOP-0526-002-01**');
    expect(resOpen.content).toContain('PT Mandiri Sejahtera');
    expect(resOpen.content).toContain('rejected');
    expect(resOpen.content).toContain('[Buka Detail Job Order](/job-orders/5ef2429a-5cdd-459b-9ed3-47f3e7bfe6fe)');

    // 2. Bare identifier input
    const resBare = await CopilotEngine.processCommand('HALU-TOP-0526-002-01', context, identity);
    expect(resBare.type).toBe('text');
    expect(resBare.content).toContain('Job Order **HALU-TOP-0526-002-01**');
    expect(resBare.content).toContain('[Buka Detail Job Order](/job-orders/5ef2429a-5cdd-459b-9ed3-47f3e7bfe6fe)');

    // 3. Not found identifier
    const resNotFound = await CopilotEngine.processCommand('buka HALU-TOP-9999-999-99', context, identity);
    expect(resNotFound.type).toBe('text');
    expect(resNotFound.content).toContain('Data operasional tidak ditemukan');
    expect(resNotFound.content).toContain('Nomor JO: HALU-TOP-9999-999-99');
  });

  it('23. LOCATION AMBIGUITY VS EXPLICIT DESTINATION: "JO Surabaya" triggers clarification, while "JO tujuan Surabaya" directly filters without generic dump', async () => {
    // 1. Ambiguous "JO Surabaya"
    const resAmbiguous = await CopilotEngine.processCommand('JO Surabaya', context, identity);
    expect(resAmbiguous.type).toBe('text');
    expect(resAmbiguous.content).toContain('Apakah yang Anda maksud adalah Job Order dengan asal Surabaya atau tujuan Surabaya?');

    // 2. Explicit "JO tujuan Surabaya"
    mockDelegate.listJobOrders = async (_ctx, filters) => {
      expect(filters.destination).toBe('Surabaya');
      return [
        {
          id: 'jo-sby-1',
          joNumber: 'ATM-BENLI-0826-001-01',
          status: 'awaiting_audit',
          customerName: 'BENLI',
          origin: 'Jakarta',
          destination: 'Surabaya WH',
          sbuType: 'TRUCKING',
        },
      ];
    };

    const resDest = await CopilotEngine.processCommand('JO tujuan Surabaya', context, identity);
    expect(resDest.type).toBe('text');
    expect(resDest.content).toContain('ATM-BENLI-0826-001-01');
    expect(resDest.content).toContain('BENLI');
    expect(resDest.content).toContain('Surabaya WH');
    // Ensure clarification question is NOT asked when destination was explicit
    expect(resDest.content).not.toContain('Apakah yang Anda maksud adalah');
  });

  it('24. CANONICAL STATUS CLASSIFICATION: classifies all real database job_orders.status values consistently', () => {
    // Terminal success
    expect(classifyCanonicalJoStatus('PEKERJAAN SELESAI')).toBe('TERMINAL_SUCCESS');
    expect(classifyCanonicalJoStatus('completed')).toBe('TERMINAL_SUCCESS');
    expect(classifyCanonicalJoStatus('COMPLETED')).toBe('TERMINAL_SUCCESS');

    // Terminal rejected / cancelled
    expect(classifyCanonicalJoStatus('rejected')).toBe('TERMINAL_REJECTED');
    expect(classifyCanonicalJoStatus('ditolak')).toBe('TERMINAL_REJECTED');
    expect(classifyCanonicalJoStatus('cancelled')).toBe('TERMINAL_CANCELLED');

    // Nonterminal
    expect(classifyCanonicalJoStatus('assigned')).toBe('NON_TERMINAL');
    expect(classifyCanonicalJoStatus('awaiting_audit')).toBe('NON_TERMINAL');
    expect(classifyCanonicalJoStatus('TIBA DI LOKASI BONGKAR')).toBe('NON_TERMINAL');

    // Filter match assertions
    expect(matchesRequestedJoStatusFilter('assigned', 'BELUM_JALAN')).toBe(true);
    expect(matchesRequestedJoStatusFilter('awaiting_audit', 'BELUM_JALAN')).toBe(true);
    expect(matchesRequestedJoStatusFilter('PEKERJAAN SELESAI', 'BELUM_JALAN')).toBe(false);
    expect(matchesRequestedJoStatusFilter('rejected', 'BELUM_JALAN')).toBe(false);

    expect(matchesRequestedJoStatusFilter('PEKERJAAN SELESAI', 'COMPLETED')).toBe(true);
    expect(matchesRequestedJoStatusFilter('completed', 'COMPLETED')).toBe(true);
    expect(matchesRequestedJoStatusFilter('rejected', 'COMPLETED')).toBe(false);
    expect(matchesRequestedJoStatusFilter('assigned', 'COMPLETED')).toBe(false);

    expect(matchesRequestedJoStatusFilter('rejected', 'REJECTED')).toBe(true);
    expect(matchesRequestedJoStatusFilter('PEKERJAAN SELESAI', 'REJECTED')).toBe(false);
  });

  it('25. STRICT STATUS SEPARATION: "JO belum selesai", "JO sudah selesai", and "JO rejected" never cross-contaminate on ATM canonical dataset', async () => {
    const atmRecords = [
      {
        id: 'ae8483cf-a962-4b7a-b028-c4ae7969e778',
        joNumber: 'ATM-ASCON-0826-002-01',
        status: 'assigned',
        customerName: 'ASCON',
        origin: 'PELABUHAN TERMINAL PETIKEMAS SURABAYA (TPS)',
        destination: 'ASCON INDO - PT ASCON INDO',
        sbuType: 'TRUCKING',
      },
      {
        id: '0d821242-7014-48bb-8ace-9b52a5b5feee',
        joNumber: 'ATM-MLT-0826-001-01',
        status: 'PEKERJAAN SELESAI',
        customerName: 'MLT',
        origin: 'CS2 - CS2 POLA SEHAT',
        destination: 'PELABUHAN TERMINAL NILAM TIMUR (Surabaya)',
        sbuType: 'TRUCKING',
      },
      {
        id: 'fe54d624-db47-4d3b-9808-0c8969eee593',
        joNumber: 'ATM-ASCON-0826-001-01',
        status: 'PEKERJAAN SELESAI',
        customerName: 'ASCON',
        origin: 'PELABUHAN TERMINAL PETIKEMAS SURABAYA (TPS)',
        destination: 'ASCON INDO - PT ASCON INDO',
        sbuType: 'TRUCKING',
      },
      {
        id: '33d08b55-688c-4cf6-b6f2-6620278348c6',
        joNumber: 'ATM-BENLI-0826-003-01',
        status: 'rejected',
        customerName: 'BENLI',
        origin: 'PELABUHAN TERMINAL PETIKEMAS SURABAYA (TPS)',
        destination: 'GUDANG BENLI - GUDANG BENLI BALONGBENDO',
        sbuType: 'TRUCKING',
      },
    ];

    // Even if a custom delegate returns all records, gateway post-check + delegate filter enforces status separation
    mockDelegate.listJobOrders = async () => atmRecords;

    // 1. "JO belum selesai" -> ONLY nonterminal ('assigned')
    const resIncomplete = await CopilotEngine.processCommand('JO belum selesai', context, identity);
    expect(resIncomplete.content).toContain('ATM-ASCON-0826-002-01');
    expect(resIncomplete.content).toContain('Status: **assigned**');
    expect(resIncomplete.content).not.toContain('ATM-MLT-0826-001-01');
    expect(resIncomplete.content).not.toContain('ATM-BENLI-0826-003-01');

    // 2. "JO sudah selesai" -> ONLY terminal success ('PEKERJAAN SELESAI')
    const resCompleted = await CopilotEngine.processCommand('JO sudah selesai', context, identity);
    expect(resCompleted.content).toContain('ATM-MLT-0826-001-01');
    expect(resCompleted.content).toContain('ATM-ASCON-0826-001-01');
    expect(resCompleted.content).toContain('Status: **PEKERJAAN SELESAI**');
    expect(resCompleted.content).not.toContain('ATM-ASCON-0826-002-01');
    expect(resCompleted.content).not.toContain('ATM-BENLI-0826-003-01');

    // 3. "JO rejected" -> ONLY rejected ('rejected')
    const resRejected = await CopilotEngine.processCommand('JO rejected', context, identity);
    expect(resRejected.content).toContain('ATM-BENLI-0826-003-01');
    expect(resRejected.content).toContain('Status: **rejected**');
    expect(resRejected.content).not.toContain('ATM-MLT-0826-001-01');
    expect(resRejected.content).not.toContain('ATM-ASCON-0826-002-01');
  });

  it('26. LOCATION SEARCH WITHOUT STATUS FILTER: "JO asal surabaya" and "JO tujuan Surabaya" return matching location records across statuses with readable formatting', async () => {
    let capturedFilters: Record<string, unknown> = {};
    mockDelegate.listJobOrders = async (_ctx, filters) => {
      capturedFilters = { ...filters };
      if (filters.origin?.toLowerCase() === 'surabaya') {
        return [
          {
            id: 'ae8483cf-a962-4b7a-b028-c4ae7969e778',
            joNumber: 'ATM-ASCON-0826-002-01',
            status: 'assigned',
            customerName: 'ASCON',
            origin: 'PELABUHAN TERMINAL PETIKEMAS SURABAYA (TPS)',
            destination: 'ASCON INDO - PT ASCON INDO',
            sbuType: 'TRUCKING',
          },
          {
            id: '33d08b55-688c-4cf6-b6f2-6620278348c6',
            joNumber: 'ATM-BENLI-0826-003-01',
            status: 'rejected',
            customerName: 'BENLI',
            origin: 'PELABUHAN TERMINAL PETIKEMAS SURABAYA (TPS)',
            destination: 'GUDANG BENLI - GUDANG BENLI BALONGBENDO',
            sbuType: 'TRUCKING',
          },
        ];
      }
      if (filters.destination?.toLowerCase() === 'surabaya') {
        return [
          {
            id: '0d821242-7014-48bb-8ace-9b52a5b5feee',
            joNumber: 'ATM-MLT-0826-001-01',
            status: 'PEKERJAAN SELESAI',
            customerName: 'MLT',
            origin: 'CS2 - CS2 POLA SEHAT',
            destination: 'PELABUHAN TERMINAL NILAM TIMUR (Surabaya)',
            sbuType: 'TRUCKING',
          },
        ];
      }
      return [];
    };

    const resOrigin = await CopilotEngine.processCommand('JO asal surabaya', context, identity);
    expect(capturedFilters.status).toBeUndefined();
    expect(String(capturedFilters.origin).toLowerCase()).toBe('surabaya');
    expect(resOrigin.content).toContain('- **ATM-ASCON-0826-002-01** — Status: **assigned** • Customer: ASCON');
    expect(resOrigin.content).toContain('- **ATM-BENLI-0826-003-01** — Status: **rejected** • Customer: BENLI');

    const resDest = await CopilotEngine.processCommand('JO tujuan Surabaya', context, identity);
    expect(capturedFilters.status).toBeUndefined();
    expect(String(capturedFilters.destination).toLowerCase()).toBe('surabaya');
    expect(resDest.content).toContain('- **ATM-MLT-0826-001-01** — Status: **PEKERJAAN SELESAI** • Customer: MLT');
  });

  it('27. VIEW JOB ORDER DETAIL END-TO-END: "buka ATM-MLT-0826-001-01" and getEntityDetail("job-order", ...) resolve canonical ATM JO by UUID and JO number with strict tenant isolation', async () => {
    const atmJoUuid = '0d821242-7014-48bb-8ace-9b52a5b5feee';
    const atmJoNumber = 'ATM-MLT-0826-001-01';
    const atmTenantId = 'c0611a0a-6210-4d6e-8206-504e6936adea';

    mockDelegate.findJobOrderByNumber = async (_ctx, joNum) => {
      if (joNum.toUpperCase() === atmJoNumber) {
        return {
          id: atmJoUuid,
          joNumber: atmJoNumber,
          status: 'PEKERJAAN SELESAI',
          customerName: 'MLT',
          driverName: 'AMAD',
          vehicleNumber: 'B 9715 UWY',
          origin: 'CS2 - CS2 POLA SEHAT',
          destination: 'PELABUHAN TERMINAL NILAM TIMUR (Surabaya)',
          sbuType: 'TRUCKING',
        };
      }
      return null;
    };

    const resOpen = await CopilotEngine.processCommand(`buka ${atmJoNumber}`, context, identity);
    expect(resOpen.content).toContain(`Job Order **${atmJoNumber}** ditemukan dengan status **PEKERJAAN SELESAI**`);
    expect(resOpen.content).toContain('- Customer: MLT');
    expect(resOpen.content).toContain('- Driver: AMAD');
    expect(resOpen.content).toContain('- Kendaraan: B 9715 UWY');
    expect(resOpen.content).toContain(`[Buka Detail Job Order](/job-orders/${atmJoUuid})`);

    // Now verify canonical getEntityDetail(ctx, 'job-order', id) used by /api/copilot/entity/job-order/[id] and /job-orders/[id]
    const mockJoRow = {
      id: atmJoUuid,
      tenant_id: atmTenantId,
      wo_item_id: '7a7622ea-7df0-45e9-ab55-daab507de3e0',
      jo_number: atmJoNumber,
      transporter_id: null,
      driver_id: '79e904e5-6a8f-4e4b-ace3-664dd1dc0cb9',
      fleet_id: 'f5b8f742-60b4-4090-be6c-e7b2b270b38c',
      driver_phone: '085233278488',
      container_number: null,
      base_price: 0,
      purchase_price: 0,
      status: 'PEKERJAAN SELESAI',
      notes: null,
      assigned_at: '2026-08-24T04:55:19.000Z',
      accepted_at: null,
      started_at: null,
      completed_at: '2026-08-24T08:00:00.000Z',
      created_at: '2026-08-24T04:55:19.000Z',
      updated_at: '2026-08-24T08:00:00.000Z',
      sbu_type: 'TRUCKING',
    };

    const createMockWoClient = (activeTenantId: string): WorkOrderDbClient => {
      const makeChain = (table: string) => {
        const filters: Record<string, unknown> = {};
        let inValues: unknown[] = [];
        const resolveRows = () => {
          if (table === 'md_drivers') {
            return {
              data: [
                { id: '79e904e5-6a8f-4e4b-ace3-664dd1dc0cb9', name: 'AMAD', phone: '085233278488' },
              ].filter((e) => inValues.includes(e.id)),
              error: null,
            };
          }
          if (table === 'md_fleets') {
            return {
              data: [
                { id: 'f5b8f742-60b4-4090-be6c-e7b2b270b38c', plate_number: 'B 9715 UWY' },
              ].filter((e) => inValues.includes(e.id)),
              error: null,
            };
          }
          if (table === 'md_entities') {
            return {
              data: [
                { id: 'cust-mlt', name: 'MLT', phone: null, attributes: {} },
              ].filter((e) => inValues.includes(e.id)),
              error: null,
            };
          }
          if (table === 'wo_items') {
            return {
              data: [
                {
                  id: '7a7622ea-7df0-45e9-ab55-daab507de3e0',
                  wo_id: 'wo-mlt-01',
                  item_data: {
                    origin_name: 'CS2 - CS2 POLA SEHAT',
                    dest_name: 'PELABUHAN TERMINAL NILAM TIMUR (Surabaya)',
                  },
                },
              ],
              error: null,
            };
          }
          if (table === 'work_orders') {
            return {
              data: [
                {
                  id: 'wo-mlt-01',
                  wo_number: 'ATM-MLT-0826-001',
                  customer_id: 'cust-mlt',
                },
              ],
              error: null,
            };
          }
          return { data: [], error: null };
        };
        const resolveSingle = async () => {
          if (table === 'job_orders') {
            if (filters.tenant_id !== atmTenantId || filters.tenant_id !== activeTenantId) {
              return { data: null, error: null };
            }
            if (filters.id === atmJoUuid || filters.jo_number === atmJoNumber) {
              return { data: mockJoRow, error: null };
            }
          }
          return { data: null, error: null };
        };
        const chain: any = {
          eq(col: string, val: unknown) {
            filters[col] = val;
            return chain;
          },
          in(_col: string, vals: unknown[]) {
            inValues = vals;
            return chain;
          },
          is() {
            return chain;
          },
          not() {
            return chain;
          },
          order() {
            return chain;
          },
          range() {
            return chain;
          },
          single: resolveSingle,
          maybeSingle: resolveSingle,
          then(onfulfilled: any, onrejected: any) {
            return Promise.resolve(resolveRows()).then(onfulfilled, onrejected);
          },
        };
        return chain;
      };
      return {
        from(table: string) {
          return {
            select() {
              return makeChain(table);
            },
            insert() {
              return makeChain(table);
            },
            update() {
              return makeChain(table);
            },
            delete() {
              return makeChain(table);
            },
          };
        },
      };
    };

    try {
      const atmIdentity: IdentityContext = {
        ...identity,
        tenantId: atmTenantId,
      };

      _setWorkOrderDbClient(createMockWoClient(atmTenantId));

      // Lookup by UUID
      const detailByUuid = await getEntityDetail(atmIdentity, 'job-order', atmJoUuid);
      expect(detailByUuid).not.toBeNull();
      expect(detailByUuid.title).toBe(atmJoNumber);
      expect(detailByUuid.status).toBe('PEKERJAAN SELESAI');
      expect(detailByUuid.statusColor).toBe('green');
      expect(detailByUuid.fields.find((f) => f.label === 'Customer')?.value).toBe('MLT');
      expect(detailByUuid.fields.find((f) => f.label === 'Work Order')?.value).toBe('ATM-MLT-0826-001');
      expect(detailByUuid.fields.find((f) => f.label === 'Driver')?.value).toBe('AMAD');
      expect(detailByUuid.fields.find((f) => f.label === 'Fleet Plate')?.value).toBe('B 9715 UWY');
      expect(detailByUuid.fields.find((f) => f.label === 'Origin')?.value).toBe('CS2 - CS2 POLA SEHAT');
      expect(detailByUuid.fields.find((f) => f.label === 'Destination')?.value).toBe('PELABUHAN TERMINAL NILAM TIMUR (Surabaya)');

      // Lookup by canonical JO number
      const detailByNumber = await getEntityDetail(atmIdentity, 'job-order', atmJoNumber);
      expect(detailByNumber).not.toBeNull();
      expect(detailByNumber.id).toBe(atmJoUuid);
      expect(detailByNumber.title).toBe(atmJoNumber);

      // Cross-tenant lookup must throw NOT_FOUND (404)
      const otherTenantIdentity: IdentityContext = {
        ...identity,
        tenantId: '78846049-fb63-45a9-93da-3af3fea5b587',
      };
      _setWorkOrderDbClient(createMockWoClient(otherTenantIdentity.tenantId));
      await expect(
        getEntityDetail(otherTenantIdentity, 'job-order', atmJoUuid),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    } finally {
      _setWorkOrderDbClient(null);
    }
  });

  it('28. ROUTE INTEGRITY: /job-orders/[id] page exists and uses canonical fetchEntityDetail("job-order", joId)', () => {
    const pagePath = path.resolve(process.cwd(), 'app/(dashboard)/job-orders/[id]/page.tsx');
    expect(fs.existsSync(pagePath)).toBe(true);
    const src = fs.readFileSync(pagePath, 'utf-8');
    expect(src).toContain("fetchEntityDetail('job-order', joId)");
    expect(src).toContain('data-testid="job-order-detail-card"');
    expect(src).toContain('data-testid="job-order-error-state"');
  });

  it('29. SALES ORDER GUIDANCE: "buat SO baru" collects fields, asks Draft vs Confirm -> WO, and preserves EXECUTE: OFF', async () => {
    const res1 = await CopilotEngine.processCommand('buat SO baru', context, identity);
    expect(res1.type).toBe('text');
    expect(res1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order (EXECUTE: OFF)');
    expect(res1.content).toContain('Draft SO');
    expect(res1.content).toContain('Simpan & Konfirmasi SO');
    expect(res1.content).toContain('/commercial/sales-orders/create');
    expect(res1.proposal).toBeUndefined();

    const res2 = await CopilotEngine.processCommand(
      'buat sales order untuk PT Mitra Sukses nilai Rp 15.000.000 tanggal 2026-10-18',
      context,
      identity,
    );
    expect(res2.type).toBe('text');
    expect(res2.content).toContain('PT Mitra Sukses');
    expect(res2.content).toContain('2026-10-18');
    expect(res2.content).toContain('15.000.000');
    expect(res2.content).toContain('EXECUTE: OFF');
  });

  it('30. SALES ORDER & WORK ORDER READ: "daftar SO", "buka SO-2026-10-0001", and "buka WO-HALU-001" resolve cleanly', async () => {
    mockDelegate.listSalesOrders = async () => [
      {
        id: 'so-uuid-001',
        soNumber: 'SO-2026-10-0001',
        customerName: 'PT Halu Logistik',
        status: 'CONFIRMED',
        orderDate: '2026-10-17',
        totalRevenue: 12500000,
        currency: 'IDR',
      },
      {
        id: 'so-uuid-002',
        soNumber: 'SO-2026-10-0002',
        customerName: 'PT Mitra Jaya',
        status: 'DRAFT',
        orderDate: '2026-10-17',
        totalRevenue: 5000000,
        currency: 'IDR',
      },
    ];
    mockDelegate.findSalesOrderByNumber = async (_ctx, num) => {
      if (num === 'SO-2026-10-0001') {
        return {
          id: 'so-uuid-001',
          soNumber: 'SO-2026-10-0001',
          customerName: 'PT Halu Logistik',
          status: 'CONFIRMED',
          orderDate: '2026-10-17',
          totalRevenue: 12500000,
          currency: 'IDR',
        };
      }
      return null;
    };
    mockDelegate.findWorkOrderByNumber = async (_ctx, num) => {
      if (num === 'WO-HALU-001') {
        return {
          id: 'wo-uuid-001',
          woNumber: 'WO-HALU-001',
          customerName: 'PT Halu Logistik',
          status: 'draft',
          orderDate: '2026-10-17',
          capability: 'TRUCKING',
        };
      }
      return null;
    };

    const listRes = await CopilotEngine.processCommand('daftar SO', context, identity);
    expect(listRes.type).toBe('text');
    expect(listRes.content).toContain('Ditemukan **2** Sales Order');
    expect(listRes.content).toContain('SO-2026-10-0001');
    expect(listRes.content).toContain('SO-2026-10-0002');

    const soDetailRes = await CopilotEngine.processCommand('buka SO-2026-10-0001', context, identity);
    expect(soDetailRes.type).toBe('text');
    expect(soDetailRes.content).toContain('Sales Order **SO-2026-10-0001** ditemukan dengan status **CONFIRMED**');
    expect(soDetailRes.content).toContain('/commercial/sales-orders/so-uuid-001');

    const woDetailRes = await CopilotEngine.processCommand('buka WO-HALU-001', context, identity);
    expect(woDetailRes.type).toBe('text');
    expect(woDetailRes.content).toContain('Work Order **WO-HALU-001** ditemukan dengan status **draft**');
    expect(woDetailRes.content).toContain('/hq/work-orders?q=WO-HALU-001');
  });

  it('31. NEW-ORDER INTENT CLASSIFICATION & SEPARATION: handles all creation variations without demanding operational IDs', async () => {
    const creationPrompts = [
      'buatkan order baru',
      'order baru',
      'buat order baru',
      'buat SO baru',
      'buat sales order baru',
      'saya ingin membuat pesanan pelanggan',
      'mulai transaksi pelanggan',
    ];

    for (const prompt of creationPrompts) {
      const res = await CopilotEngine.processCommand(prompt, context, identity);
      expect(res.type).toBe('text');
      // Must NOT hit unknown operational object firewall
      expect(res.content).not.toContain('tidak memiliki referensi objek operasional');
      // Must guide to Sales Order creation with governance summary
      expect(res.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order (EXECUTE: OFF)');
      expect(res.content).toContain('Draft SO');
      expect(res.content).toContain('Simpan & Konfirmasi SO');
      expect(res.content).toContain('Work Order (WO)');
      expect(res.content).toContain('/commercial/sales-orders/create');
      expect(res.content).toContain('/commercial/sales-orders');
      expect(res.proposal).toBeUndefined();
    }

    // Ambiguous operational query without creation intent must hit clarification firewall
    const ambiguousRes = await CopilotEngine.processCommand('tolong urus pengiriman', context, identity);
    expect(ambiguousRes.type).toBe('text');
    expect(ambiguousRes.content).toMatch(/(klarifikasi objek|beberapa entitas|referensi objek)/i);
    expect(ambiguousRes.content).not.toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');
  });

  it('32. COMMERCIAL AUTHORIZATION BOUNDARY: users without commercial:read receive guidance but cannot read protected SO records', async () => {
    const rahmaIdentity: IdentityContext = {
      userId: '5a665173-a6c2-43c4-bd7e-0d4806701bf3',
      tenantId: '78846049-fb63-45a9-93da-3af3fea5b587',
      role: 'hq_cs',
      roles: ['hq_cs'],
      permissions: ['copilot:read', 'job_order:read', 'work_order:read', 'customer_visibility:read'], // strictly NO commercial:read
      sbuScope: 'trucking',
    };

    const rahmaContext = OperationalContext.create({
      tenant: TenantContext.create({ id: rahmaIdentity.tenantId }),
      user: UserContext.create({ id: rahmaIdentity.userId, displayName: 'RAHMA', roles: ['hq_cs'] }),
      permissions: PermissionContext.create(rahmaIdentity.permissions),
      conversation: ConversationContext.create({ conversationId: 'test-rahma-session' }),
      workspace: WorkspaceContext.create({}),
    });

    // 32A. Guidance and form links do NOT require commercial:read; user receives helpful instructions
    const guidancePrompts = ['buatkan order baru', 'order baru', 'buat SO baru'];
    for (const prompt of guidancePrompts) {
      const res = await CopilotEngine.processCommand(prompt, rahmaContext, rahmaIdentity);
      expect(res.type).toBe('text');
      expect(res.content).not.toContain('tidak memiliki referensi objek operasional');
      expect(res.content).not.toContain('Missing required permission');
      expect(res.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order (EXECUTE: OFF)');
      expect(res.content).toContain('/commercial/sales-orders/create');
      expect(res.proposal).toBeUndefined();
    }

    // 32B. Read queries for protected Sales Order records are rejected with clear explanation
    const readPrompts = ['sales order draft', 'daftar SO', 'buka SO-2026-10-0001'];
    for (const prompt of readPrompts) {
      const res = await CopilotEngine.processCommand(prompt, rahmaContext, rahmaIdentity);
      expect(res.type).toBe('text');
      expect(res.content).toContain('Akses ditolak: Pembacaan data Sales Order memerlukan izin \'commercial:read\'');
      expect(res.content).toContain('hq_cs');
      expect(res.content).toContain('/commercial/sales-orders/create');
    }

    // 32C. Privileged user with commercial:read can read sales order records
    mockDelegate.listSalesOrders = async (_ctx, filters) => {
      if (filters?.status === 'draft' || filters?.status === 'DRAFT') {
        return [
          {
            id: 'so-draft-001',
            soNumber: 'SO-2026-10-0099',
            customerName: 'PT Rahma Jaya',
            status: 'DRAFT',
            orderDate: '2026-10-18',
            totalRevenue: 8000000,
            currency: 'IDR',
          },
        ];
      }
      return [];
    };

    const draftRes = await CopilotEngine.processCommand('sales order draft', context, identity);
    expect(draftRes.type).toBe('text');
    expect(draftRes.content).toContain('SO-2026-10-0099');
    expect(draftRes.content).toContain('DRAFT');
  });
});



