/**
 * Sentralogis — U-28 Copilot Customer Intents & Routing Test Suite
 * lib/__tests__/u28-copilot-customer-intents-routing.test.ts
 *
 * Verifies that:
 * 1. "cari pelanggan PT TRADING PERDANA SUKSES" routes to customer search
 * 2. "buat pelanggan baru" initiates customer registration flow
 * 3. Customer name sent during active order state is accepted as answer, never operational error
 * 4. Customer name sent without active state does not produce operational object reference error
 * 5. Single and multiple search results handled correctly with canonical IDs and codes
 * 6. Non-existent customer handled correctly without automatic record creation
 * 7. Role hq_cs can search authorized customers in their tenant
 * 8. User without commercial:manage is rejected when creating new customer
 * 9. Multi-tenant isolation is strictly enforced
 * 10. Prior Sales Order creation flow remains working without regression
 * 11. Legitimate operational reads (JO, WO, SO, Shipment) continue to function
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { ConversationalOrderWorkspace, _setWorkspaceDbClient } from '@/lib/copilot/workflow/conversational-order-workspace';
import { CustomerIntentHandler, _setCustomerDbClient } from '@/lib/copilot/customer/customer-intent-handler';
import { _setOperationalReadDelegate } from '@/lib/copilot/read/operational-live-read-gateway';
import { _setSalesOrderDbClient } from '@/lib/sales-order/service';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import type { IdentityContext } from '@/lib/application/identity/types';

describe('U-28 Copilot Customer Intents & Routing', () => {
  const TENANT_A = 'tenant-uuid-alpha-1111';
  const TENANT_B = 'tenant-uuid-beta-2222';

  // Role hq_cs: CS user with sales_order:create and sales_order:read (lacks commercial:manage)
  const csIdentityA: IdentityContext = {
    userId: 'user-cs-rahma',
    tenantId: TENANT_A,
    role: 'hq_cs',
    roles: ['hq_cs'],
    permissions: [
      'copilot:read',
      'sales_order:create',
      'sales_order:read',
      'customer_visibility:read',
      'work_order:read',
      'job_order:read',
    ],
    sbuScope: 'trucking',
  };

  // Role commercial_manager: Full commercial authority (has commercial:manage and commercial:read)
  const managerIdentityA: IdentityContext = {
    userId: 'user-manager-commercial',
    tenantId: TENANT_A,
    role: 'commercial_admin',
    roles: ['commercial_admin'],
    permissions: [
      'copilot:read',
      'commercial:read',
      'commercial:manage',
      'sales_order:create',
      'sales_order:read',
    ],
    sbuScope: null,
  };

  // Ground staff: Unauthorized for commercial read and write
  const groundStaffIdentityA: IdentityContext = {
    userId: 'user-ground-staff',
    tenantId: TENANT_A,
    role: 'ground_staff',
    roles: ['ground_staff'],
    permissions: ['copilot:read', 'job_order:read'],
    sbuScope: 'trucking',
  };

  let mockEntities: Array<{
    id: string;
    tenant_id: string;
    name: string;
    entity_code?: string;
    is_customer?: boolean;
    is_active?: boolean;
  }>;
  let mockEngagements: Array<any>;
  let mockSalesOrders: Array<any>;
  let nextSoSeq = 1;

  function createMockDb() {
    return {
      rpc: async (fn: string, args: any) => {
        if (fn === 'next_sales_order') {
          const num = String(nextSoSeq++).padStart(4, '0');
          return { data: `SO-2026-10-${num}`, error: null };
        }
        return { data: null, error: null };
      },
      from: (table: string) => {
        let rows = table === 'md_entities'
          ? mockEntities
          : table === 'commercial_work_orders'
          ? mockEngagements
          : mockSalesOrders;

        return {
          select: (cols = '*') => {
            const filters: Array<(r: any) => boolean> = [];
            let limitNum = 100;

            const chain: any = {
              eq: (col: string, val: any) => {
                filters.push((r: any) => r[col] === val);
                return chain;
              },
              in: (col: string, vals: any[]) => {
                filters.push((r: any) => vals.includes(r[col]));
                return chain;
              },
              or: (orClause: string) => {
                // e.g. name.ilike.%TRADING%,legal_name.ilike.%TRADING%,entity_code.ilike.%TRADING%
                const parts = orClause.split(',').map((p) => p.trim());
                filters.push((r: any) => {
                  return parts.some((part) => {
                    const match = part.match(/^([a-zA-Z_]+)\.ilike\.%(.*)%$/);
                    if (match) {
                      const col = match[1];
                      const clean = match[2].toLowerCase();
                      const val = String(r[col] || '').toLowerCase();
                      return val.includes(clean);
                    }
                    return false;
                  });
                });
                return chain;
              },
              ilike: (col: string, pat: string) => {
                const clean = pat.replace(/%/g, '').toLowerCase();
                filters.push((r: any) => {
                  const valMatch = String(r[col] || '').toLowerCase().includes(clean);
                  const codeMatch = table === 'md_entities' && String(r.entity_code || '').toLowerCase().includes(clean);
                  const legalMatch = table === 'md_entities' && String(r.legal_name || '').toLowerCase().includes(clean);
                  return valMatch || codeMatch || legalMatch;
                });
                return chain;
              },
              like: (col: string, pat: string) => {
                const clean = pat.replace(/%/g, '').toLowerCase();
                filters.push((r: any) => String(r[col] || '').toLowerCase().includes(clean));
                return chain;
              },
              order: () => chain,
              limit: (num: number) => {
                limitNum = num;
                return chain;
              },
              single: async () => {
                const filtered = rows.filter((r: any) => filters.every((fn) => fn(r)));
                if (filtered.length === 0) return { data: null, error: { message: 'Row not found' } };
                return { data: filtered[0], error: null };
              },
              maybeSingle: async () => {
                const filtered = rows.filter((r: any) => filters.every((fn) => fn(r)));
                return { data: filtered[0] || null, error: null };
              },
              then: (resolve: any, reject?: any) => {
                const filtered = rows.filter((r: any) => filters.every((fn) => fn(r)));
                return Promise.resolve({ data: filtered.slice(0, limitNum), error: null }).then(resolve, reject);
              },
            };
            return chain;
          },
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const row = {
                  id: payload.id || `uuid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...payload,
                };
                if (table === 'md_entities') {
                  mockEntities.push(row);
                } else if (table === 'commercial_work_orders') {
                  mockEngagements.push(row);
                } else {
                  mockSalesOrders.push(row);
                }
                return { data: row, error: null };
              },
            }),
          }),
          update: (patch: any) => ({
            eq: (col1: string, val1: any) => ({
              eq: (col2: string, val2: any) => ({
                select: async () => {
                  const found = rows.find((r: any) => r[col1] === val1 && r[col2] === val2);
                  if (found) Object.assign(found, patch, { updated_at: new Date().toISOString() });
                  return { data: found ? [found] : [], error: null };
                },
              }),
            }),
          }),
        };
      },
    };
  }

  function createTestContext(identity: IdentityContext, conversationId = 'default-session') {
    return OperationalContext.create({
      tenant: TenantContext.create({ id: identity.tenantId }),
      user: UserContext.create({ id: identity.userId, displayName: 'Test User', roles: identity.roles }),
      permissions: PermissionContext.create(identity.permissions),
      conversation: ConversationContext.create({ conversationId }),
      workspace: WorkspaceContext.create({}),
    });
  }

  beforeEach(() => {
    ConversationalOrderWorkspace.resetAllSessions();
    nextSoSeq = 1;
    mockEngagements = [];
    mockSalesOrders = [];
    mockEntities = [
      {
        id: 'cust-uuid-tps',
        tenant_id: TENANT_A,
        name: 'PT TRADING PERDANA SUKSES',
        entity_code: 'TPS-01',
        is_customer: true,
        is_active: true,
      },
      {
        id: 'cust-uuid-slm',
        tenant_id: TENANT_A,
        name: 'PT Samudera Logistik Makmur',
        entity_code: 'SLM-02',
        is_customer: true,
        is_active: true,
      },
      {
        id: 'cust-uuid-sn',
        tenant_id: TENANT_A,
        name: 'PT Samudera Nusantara',
        entity_code: 'SN-03',
        is_customer: true,
        is_active: true,
      },
      {
        id: 'cust-uuid-tenant-b',
        tenant_id: TENANT_B,
        name: 'PT Beta Customer Secret',
        entity_code: 'BCS-99',
        is_customer: true,
        is_active: true,
      },
    ];

    const db = createMockDb();
    _setCustomerDbClient(db);
    _setWorkspaceDbClient(db);
    _setSalesOrderDbClient(db as any);
    _setEngagementDbClient(db as any);

    // Mock operational live read delegate
    _setOperationalReadDelegate({
      listJobOrders: async () => [
        {
          id: 'jo-01',
          joNumber: 'JO-2026-0001',
          status: 'in_progress',
          customerName: 'PT TRADING PERDANA SUKSES',
          sbuType: 'TRUCKING',
        },
      ],
      findJobOrderByNumber: async (_ctx, num) => ({
        id: 'jo-01',
        joNumber: num,
        status: 'in_progress',
        customerName: 'PT TRADING PERDANA SUKSES',
        sbuType: 'TRUCKING',
      }),
      listSalesOrders: async () => [],
      findSalesOrderByNumber: async () => null,
      listWorkOrders: async () => [],
      findWorkOrderByNumber: async () => null,
      listShipments: async () => [],
      findShipmentByNumber: async () => null,
    });
  });

  afterEach(() => {
    ConversationalOrderWorkspace.resetAllSessions();
    _setCustomerDbClient(null);
    _setWorkspaceDbClient(null);
    _setSalesOrderDbClient(null);
    _setEngagementDbClient(null);
  });

  // --------------------------------------------------------------------------
  // Test 1: "cari pelanggan PT TRADING PERDANA SUKSES" routes to customer search
  // --------------------------------------------------------------------------
  it('1. "cari pelanggan PT TRADING PERDANA SUKSES" routes to customer search and returns canonical details', async () => {
    const context = createTestContext(csIdentityA);
    const res = await CopilotEngine.processCommand(
      'cari pelanggan PT TRADING PERDANA SUKSES',
      context,
      csIdentityA,
    );

    expect(res.type).toBe('text');
    expect(res.content).not.toContain('Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid');
    expect(res.content).toContain('PT TRADING PERDANA SUKSES');
    expect(res.content).toContain('cust-uuid-tps');
    expect(res.content).toContain('TPS-01');
    expect(res.content).toContain('AKTIF');
  });

  // --------------------------------------------------------------------------
  // Test 2: "buat pelanggan baru" starts customer registration flow
  // --------------------------------------------------------------------------
  it('2. "buat pelanggan baru" initiates customer registration flow when user has commercial:manage', async () => {
    const context = createTestContext(managerIdentityA);
    const res = await CopilotEngine.processCommand('buat pelanggan baru', context, managerIdentityA);

    expect(res.type).toBe('text');
    expect(res.content).not.toContain('Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid');
    expect(res.content).toContain('nama resmi customer/pelanggan yang ingin Anda daftarkan');
  });

  // --------------------------------------------------------------------------
  // Test 3: Customer name during active order flow is accepted as answer
  // --------------------------------------------------------------------------
  it('3. Customer name sent during active order state is accepted as answer, never operational error', async () => {
    const context = createTestContext(csIdentityA, 'session-order-test-3');

    // Turn 1: Start order flow
    const resTurn1 = await CopilotEngine.processCommand('buat order baru', context, csIdentityA);
    expect(resTurn1.type).toBe('text');
    expect(resTurn1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');
    expect(resTurn1.content).toContain('**Customer:** *(Belum diisi — wajib)*');

    // Turn 2: Provide customer name "PT TRADING PERDANA SUKSES"
    const resTurn2 = await CopilotEngine.processCommand(
      'PT TRADING PERDANA SUKSES',
      context,
      csIdentityA,
    );

    expect(resTurn2.type).toBe('text');
    expect(resTurn2.content).not.toContain('Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid');
    expect(resTurn2.content).toContain('PT TRADING PERDANA SUKSES');
    expect(resTurn2.content).toContain('jenis layanan/SBU');
  });

  // --------------------------------------------------------------------------
  // Test 4: Customer name sent WITHOUT active state does not produce operational error
  // --------------------------------------------------------------------------
  it('4. Customer name sent without active state does not produce operational reference error', async () => {
    const context = createTestContext(csIdentityA);
    const res = await CopilotEngine.processCommand('PT TRADING PERDANA SUKSES', context, csIdentityA);

    expect(res.type).toBe('text');
    expect(res.content).not.toContain('Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid');
    expect(res.content).toContain('PT TRADING PERDANA SUKSES');
    expect(res.content).toContain('TPS-01');
    expect(res.content).toContain('Buat Order Baru');
  });

  // --------------------------------------------------------------------------
  // Test 5: Single vs multiple search results handled correctly
  // --------------------------------------------------------------------------
  it('5. Single and multiple search results are handled correctly', async () => {
    const context = createTestContext(csIdentityA);

    // Search term matching multiple customers: "Samudera"
    const resMulti = await CopilotEngine.processCommand('cari customer Samudera', context, csIdentityA);
    expect(resMulti.type).toBe('text');
    expect(resMulti.content).toContain('Ditemukan **2** customer');
    expect(resMulti.content).toContain('PT Samudera Logistik Makmur');
    expect(resMulti.content).toContain('PT Samudera Nusantara');

    // Search term matching exactly one: "Makmur"
    const resSingle = await CopilotEngine.processCommand('cari pelanggan Makmur', context, csIdentityA);
    expect(resSingle.type).toBe('text');
    expect(resSingle.content).toContain('PT Samudera Logistik Makmur');
    expect(resSingle.content).toContain('SLM-02');
    expect(resSingle.content).toContain('cust-uuid-slm');
  });

  // --------------------------------------------------------------------------
  // Test 6: Customer not found handled correctly without auto-creation
  // --------------------------------------------------------------------------
  it('6. Non-existent customer handled correctly without automatic record creation', async () => {
    const context = createTestContext(csIdentityA);
    const countBefore = mockEntities.length;

    const res = await CopilotEngine.processCommand('cari pelanggan PT TIDAK ADA DI SINI', context, csIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain('tidak ditemukan pada data master');
    expect(res.content).not.toContain('Perintah tidak dapat dieksekusi');

    // Verify no phantom record was created
    expect(mockEntities.length).toBe(countBefore);
  });

  // --------------------------------------------------------------------------
  // Test 7: Role hq_cs can search registered customers in their tenant
  // --------------------------------------------------------------------------
  it('7. Role hq_cs can search registered customers in their authorized tenant', async () => {
    const context = createTestContext(csIdentityA);
    const res = await CopilotEngine.processCommand('cari pelanggan TPS', context, csIdentityA);

    expect(res.type).toBe('text');
    expect(res.content).not.toContain('Akses ditolak');
    expect(res.content).toContain('PT TRADING PERDANA SUKSES');
  });

  // --------------------------------------------------------------------------
  // Test 8: User without commercial:manage is rejected when creating new customer
  // --------------------------------------------------------------------------
  it('8. User without customer:register or commercial:manage is rejected when creating new customer', async () => {
    const context = createTestContext(groundStaffIdentityA);
    const res = await CopilotEngine.processCommand('buat pelanggan baru', context, groundStaffIdentityA);

    expect(res.type).toBe('text');
    expect(res.content).toContain("Akses ditolak: Pendaftaran entitas Customer baru memerlukan izin 'customer:register' atau 'commercial:manage'");
    expect(res.content).toContain('ground_staff');
  });

  // --------------------------------------------------------------------------
  // Test 9: Tenant isolation strictly enforced
  // --------------------------------------------------------------------------
  it('9. Cross-tenant isolation: customer from another tenant is never visible', async () => {
    const context = createTestContext(csIdentityA);

    // Tenant A queries for Tenant B customer
    const res = await CopilotEngine.processCommand('cari pelanggan Beta Customer Secret', context, csIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain('tidak ditemukan pada data master');
    expect(res.content).not.toContain('BCS-99');
    expect(res.content).not.toContain('cust-uuid-tenant-b');
  });

  // --------------------------------------------------------------------------
  // Test 10: Prior Sales Order creation flow remains fully functional
  // --------------------------------------------------------------------------
  it('10. Prior Sales Order creation flow remains fully functional without regression', async () => {
    const context = createTestContext(csIdentityA, 'session-order-test-10');

    // 1. Initiate order
    const r1 = await CopilotEngine.processCommand('buat order baru', context, csIdentityA);
    expect(r1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');

    // 2. Specify customer
    const r2 = await CopilotEngine.processCommand('PT TRADING PERDANA SUKSES', context, csIdentityA);
    expect(r2.content).toContain('PT TRADING PERDANA SUKSES');
    expect(r2.content).toContain('jenis layanan/SBU');

    // 3. Choose service
    const r3 = await CopilotEngine.processCommand('Trucking', context, csIdentityA);
    expect(r3.content).toContain('SBU TRUCKING');
    expect(r3.content).toContain('Layanan:** TRUCKING');

    // 4. Provide details
    const r4 = await CopilotEngine.processCommand('Jakarta ke Surabaya, muatan 1 kontainer semen, nilai 15 juta', context, csIdentityA);
    expect(r4.content).toContain('Ringkasan Sales Order (EXECUTE: OFF)');
    expect(r4.content).toContain('IDR 15.000.000');
  });

  // --------------------------------------------------------------------------
  // Test 11: Legitimate operational reads (JO, WO, SO, Shipment) remain intact
  // --------------------------------------------------------------------------
  it('11. Legitimate operational read queries continue to route to operational live read gateway', async () => {
    const context = createTestContext(csIdentityA);

    // Operational query: "JO belum selesai"
    const resJo = await CopilotEngine.processCommand('JO belum selesai', context, csIdentityA);
    expect(resJo.type).toBe('text');
    expect(resJo.content).toContain('JO-2026-0001');

    // Operational query: "buka JO-2026-0001"
    const resBukaJo = await CopilotEngine.processCommand('buka JO-2026-0001', context, csIdentityA);
    expect(resBukaJo.type).toBe('text');
    expect(resBukaJo.content).toContain('JO-2026-0001');
  });

  // --------------------------------------------------------------------------
  // Test 12: Duplicate customer detection shows warning banner
  // --------------------------------------------------------------------------
  it('12. Duplicate customer detection displays warning banner before registration', async () => {
    const context = createTestContext(managerIdentityA);
    // User tries to register "PT TRADING PERDANA UTAMA" while "PT TRADING PERDANA SUKSES" already exists
    const res = await CopilotEngine.processCommand('daftarkan customer baru PT TRADING PERDANA UTAMA', context, managerIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Perhatian');
    expect(res.content).toContain('Ditemukan nama customer yang mirip pada database master');
    expect(res.content).toContain('PT TRADING PERDANA SUKSES');
    expect(res.content).toContain('Ya, daftarkan');
  });

  // --------------------------------------------------------------------------
  // Test 13: Customer registration with confirmation for authorized commercial role
  // --------------------------------------------------------------------------
  it('13. Authorized commercial user confirms customer registration and entity is saved to master', async () => {
    const context = createTestContext(managerIdentityA);
    const initialCount = mockEntities.length;

    // Confirm registration
    const res = await CopilotEngine.processCommand('Ya, daftarkan PT Cemerlang Logistik Nusantara', context, managerIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Customer baru berhasil didaftarkan ke data master');
    expect(res.content).toContain('PT Cemerlang Logistik Nusantara');
    expect(res.content).toContain('ID Kanonik');
    expect(res.content).toContain('Form Buat Sales Order');

    // Verify entity was persisted in mock database
    expect(mockEntities.length).toBe(initialCount + 1);
    const created = mockEntities.find((e) => e.name === 'PT Cemerlang Logistik Nusantara');
    expect(created).toBeDefined();
    expect(created?.tenant_id).toBe(TENANT_A);
    expect(created?.is_customer).toBe(true);
    expect(created?.is_active).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Test 14: End-to-end multi-turn CS Sales Order creation with canonical customer ID binding
  // --------------------------------------------------------------------------
  it('14. Complete 5-turn CS conversational order workspace binds canonical customer ID to Draft SO', async () => {
    const convoId = 'session-multi-turn-cs-14';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: Initiation
    const r1 = await CopilotEngine.processCommand('buatkan order baru', context, csIdentityA);
    expect(r1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');
    expect(r1.content).toContain('Customer:** *(Belum diisi — wajib)*');

    // Turn 2: Select Customer "PT TRADING PERDANA SUKSES"
    const r2 = await CopilotEngine.processCommand('PT TRADING PERDANA SUKSES', context, csIdentityA);
    expect(r2.content).toContain('PT TRADING PERDANA SUKSES');
    expect(r2.content).toContain('jenis layanan/SBU');

    // Turn 3: Select Service "Trucking"
    const r3 = await CopilotEngine.processCommand('Trucking', context, csIdentityA);
    expect(r3.content).toContain('SBU TRUCKING');

    // Turn 4: Provide Route, Cargo, and Agreed Revenue
    const r4 = await CopilotEngine.processCommand('dari Jakarta ke Surabaya muatan 10 ton semen nilai kesepakatan 20 juta', context, csIdentityA);
    expect(r4.content).toContain('Ringkasan Sales Order (EXECUTE: OFF)');
    expect(r4.content).toContain('Jakarta ➔ Surabaya');
    expect(r4.content).toContain('10 ton semen');
    expect(r4.content).toContain('IDR 20.000.000');
    expect(r4.content).toContain('Simpan');

    // Turn 5: Confirm Save
    const r5 = await CopilotEngine.processCommand('Simpan', context, csIdentityA);
    expect(r5.content).toContain('Sales Order Berhasil Dibuat! (EXECUTE: ON — Tersimpan Resmi)');
    expect(r5.content).toContain('Nomor Sales Order:** `SO-2026-10-0001`');
    expect(r5.content).toContain('Status:** `DRAFT`');
    expect(r5.content).toContain('Customer:** PT TRADING PERDANA SUKSES (ID: `cust-uuid-tps`)');

    // Verify database record
    expect(mockSalesOrders.length).toBe(1);
    const savedSo = mockSalesOrders[0];
    expect(savedSo.so_number).toBe('SO-2026-10-0001');
    expect(savedSo.status).toBe('DRAFT');
    expect(savedSo.tenant_id).toBe(TENANT_A);
    expect(savedSo.total_agreed_revenue).toBe(20000000);

    // Verify parent engagement relation has customer_id = 'cust-uuid-tps'
    expect(mockEngagements.length).toBe(1);
    const parentEng = mockEngagements[0];
    expect(parentEng.id).toBe(savedSo.engagement_id);
    expect(parentEng.customer_id).toBe('cust-uuid-tps');
    expect(parentEng.tenant_id).toBe(TENANT_A);
  });

  // --------------------------------------------------------------------------
  // Test 15: Uncommitted customer cannot save to database
  // --------------------------------------------------------------------------
  it('15. Order with uncommitted customer is blocked from database save and does not falsely claim success', async () => {
    const convoId = 'session-uncommitted-cust-15';
    const context = createTestContext(csIdentityA, convoId);

    // Initiate order for unknown customer
    await CopilotEngine.processCommand('buat order baru untuk PT Belum Terdaftar Mandiri', context, csIdentityA);
    // User affirms registration (buffers as uncommitted customer for CS)
    await CopilotEngine.processCommand('Ya, daftarkan', context, csIdentityA);
    // User provides details
    await CopilotEngine.processCommand('Trucking dari Jakarta ke Bandung muatan 5 ton semen nilai 8 juta', context, csIdentityA);

    // Attempt to save
    const rSave = await CopilotEngine.processCommand('Simpan', context, csIdentityA);
    expect(rSave.content).toContain('Penyimpanan Memerlukan Customer Terdaftar');
    expect(rSave.content).toContain('PT Belum Terdaftar Mandiri');
    expect(rSave.content).toContain('ADR-034');
    expect(rSave.content).not.toContain('Sales Order Berhasil Dibuat');

    // Database must have ZERO new sales orders
    expect(mockSalesOrders.length).toBe(0);
    expect(mockEngagements.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // Test 16: Immediate confirm request by CS saves as DRAFT with role explanation
  // --------------------------------------------------------------------------
  it('16. Immediate confirm request by CS saves as DRAFT with explanatory permission notice', async () => {
    const convoId = 'session-cs-confirm-16';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: Complete single-prompt order with "konfirmasi"
    const r1 = await CopilotEngine.processCommand(
      'buat sales order untuk PT TRADING PERDANA SUKSES trucking Jakarta ke Surabaya muatan 2 rit semen nilai 18 juta tanggal 2026-10-30 konfirmasi',
      context,
      csIdentityA,
    );
    expect(r1.content).toContain('Ringkasan Sales Order');

    // Turn 2: Confirm save
    const r2 = await CopilotEngine.processCommand('Simpan', context, csIdentityA);
    expect(r2.content).toContain('Sales Order Berhasil Dibuat!');
    expect(r2.content).toContain('Status:** `DRAFT`');
    expect(r2.content).toContain('Catatan Otorisasi');
    expect(r2.content).toContain('hq_cs');
    expect(r2.content).toContain('commercial:manage');

    // Order in DB is DRAFT, not CONFIRMED
    expect(mockSalesOrders.length).toBe(1);
    expect(mockSalesOrders[0].status).toBe('DRAFT');
  });

  // --------------------------------------------------------------------------
  // Test 17: "buat order baru PT TRADING PERDANA SUKSES" resolves existing customer
  // without asking to register new customer
  // --------------------------------------------------------------------------
  it('17. "buat order baru PT TRADING PERDANA SUKSES" resolves existing customer and advances to service selection without registration', async () => {
    const convoId = 'session-resolve-existing-17';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: User types "buat order baru PT TRADING PERDANA SUKSES"
    const r1 = await CopilotEngine.processCommand(
      'buat order baru PT TRADING PERDANA SUKSES',
      context,
      csIdentityA,
    );

    // Expect: Customer verified and proceeds to SBU / service selection
    expect(r1.content).toContain('PT TRADING PERDANA SUKSES');
    expect(r1.content).toContain('berhasil diverifikasi');
    expect(r1.content).toContain('pilih jenis layanan/SBU yang diinginkan');
    // Must NOT offer customer registration
    expect(r1.content).not.toContain('belum terdaftar');
    expect(r1.content).not.toContain('Apakah Anda ingin mendaftarkan');

    // Turn 2: User selects service "Trucking"
    const r2 = await CopilotEngine.processCommand('Trucking', context, csIdentityA);
    expect(r2.content).toContain('SBU TRUCKING');
    expect(r2.content).toContain('Layanan:** TRUCKING');

    // Turn 3: Provide details
    const r3 = await CopilotEngine.processCommand(
      'Jakarta ke Surabaya, muatan 1 kontainer semen, nilai 15 juta',
      context,
      csIdentityA,
    );
    expect(r3.content).toContain('Ringkasan Sales Order (EXECUTE: OFF)');
    expect(r3.content).toContain('PT TRADING PERDANA SUKSES');

    // Turn 4: Save draft
    const r4 = await CopilotEngine.processCommand('Simpan', context, csIdentityA);
    expect(r4.content).toContain('Sales Order Berhasil Dibuat!');
    // Verify canonical customer ID bound to saved Sales Order
    expect(mockSalesOrders.length).toBe(1);
    expect(mockEngagements.length).toBe(1);
    expect(mockEngagements[0].customer_id).toBe('cust-uuid-tps');
    expect(mockSalesOrders[0].engagement_id).toBe(mockEngagements[0].id);
    expect(r4.content).toContain('cust-uuid-tps');
  });

  // --------------------------------------------------------------------------
  // Test 18: Resolves entity when searched by legal_name or variations
  // --------------------------------------------------------------------------
  it('18. Resolves customer when stored with legal_name and shorthand name (e.g. TPS / PT. TRADING PERDANA SUKSES)', async () => {
    // Add entity where name is "TPS" and legal_name is "PT TRADING PERDANA SUKSES"
    mockEntities.push({
      id: 'cust-uuid-tps-prod',
      tenant_id: TENANT_A,
      name: 'TPS',
      legal_name: 'PT TRADING PERDANA SUKSES',
      entity_code: 'CUS/001',
      is_customer: true,
      is_active: true,
    });
    // Remove the other TPS to isolate single match
    mockEntities = mockEntities.filter((e) => e.id !== 'cust-uuid-tps');

    const convoId = 'session-legal-name-18';
    const context = createTestContext(csIdentityA, convoId);

    // Search with "PT. TRADING PERDANA SUKSES" (with dot)
    const r1 = await CopilotEngine.processCommand(
      'buat order baru PT. TRADING PERDANA SUKSES',
      context,
      csIdentityA,
    );

    expect(r1.content).toContain('TPS');
    expect(r1.content).toContain('PT TRADING PERDANA SUKSES');
    expect(r1.content).toContain('berhasil diverifikasi');
    expect(r1.content).not.toContain('belum terdaftar');
  });

  // --------------------------------------------------------------------------
  // Test 19: Ambiguous customer search presents numbered choices and accepts selection
  // --------------------------------------------------------------------------
  it('19. Ambiguous matches present safe numbered choices and allow user selection by number', async () => {
    // mockEntities contains PT Samudera Logistik Makmur and PT Samudera Nusantara
    const convoId = 'session-ambiguous-19';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: User says "buat order baru Samudera"
    const r1 = await CopilotEngine.processCommand('buat order baru Samudera', context, csIdentityA);
    expect(r1.content).toContain('Ditemukan beberapa customer yang cocok');
    expect(r1.content).toContain('1. **PT Samudera Logistik Makmur**');
    expect(r1.content).toContain('2. **PT Samudera Nusantara**');

    // Turn 2: User responds with "1"
    const r2 = await CopilotEngine.processCommand('1', context, csIdentityA);
    expect(r2.content).toContain('PT Samudera Logistik Makmur');
    expect(r2.content).toContain('berhasil dipilih dan diverifikasi');
    expect(r2.content).toContain('pilih jenis layanan/SBU yang diinginkan');
  });

  // --------------------------------------------------------------------------
  // Test 20: Database error during lookup does NOT offer new customer registration
  // --------------------------------------------------------------------------
  it('20. Database error during customer lookup does NOT falsely trigger new customer registration', async () => {
    const errorDb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              limit: async () => ({ data: null, error: new Error('PostgreSQL connection timeout') }),
            }),
            ilike: () => ({
              limit: async () => ({ data: null, error: new Error('PostgreSQL connection timeout') }),
            }),
          }),
        }),
      }),
    };
    _setWorkspaceDbClient(errorDb);

    const convoId = 'session-error-guard-20';
    const context = createTestContext(csIdentityA, convoId);

    const r = await CopilotEngine.processCommand(
      'buat order baru PT TRADING PERDANA SUKSES',
      context,
      csIdentityA,
    );

    // Must warn about database problem, NOT say "belum terdaftar di data master" or "daftarkan customer baru"
    expect(r.content).toContain('Terjadi kendala saat memeriksa database customer');
    expect(r.content).not.toContain('belum terdaftar pada data master');
    expect(r.content).not.toContain('Apakah Anda ingin mendaftarkan');
  });

  // --------------------------------------------------------------------------
  // Test 21: After destination is provided, Copilot must still prompt for cargo & quantity
  // and destination is NEVER copied to cargo
  // --------------------------------------------------------------------------
  it('21. Destination does not copy into cargo and Copilot requires cargo and quantity before proposal', async () => {
    const convoId = 'session-dest-not-cargo-21';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: Initiation
    await CopilotEngine.processCommand('buat order baru', context, csIdentityA);

    // Turn 2: Customer selection
    await CopilotEngine.processCommand('PT TRADING PERDANA SUKSES', context, csIdentityA);

    // Turn 3: Service selection
    const r3 = await CopilotEngine.processCommand('Trucking', context, csIdentityA);
    expect(r3.content).toContain('SBU TRUCKING');

    // Turn 4: User provides origin: "Pelabuhan Tanjung Priok"
    const r4 = await CopilotEngine.processCommand('Pelabuhan Tanjung Priok', context, csIdentityA);
    expect(r4.content).toContain('Lokasi Tujuan (Destination)');
    expect(r4.content).toContain('Deskripsi Muatan (Cargo)');

    // Turn 5: User provides destination with colon: "Tujuan: PURI MUTIARA INDAH"
    const r5 = await CopilotEngine.processCommand('Tujuan: PURI MUTIARA INDAH', context, csIdentityA);

    // MUST NOT transition to review/proposal yet
    expect(r5.type).toBe('text');
    expect(r5.proposal).toBeUndefined();
    expect(r5.content).toContain('Data yang masih perlu dilengkapi:');
    expect(r5.content).toContain('Deskripsi Muatan (Cargo)');
    expect(r5.content).toContain('Jumlah / Kuantitas (Qty)');
    expect(r5.content).toContain('PURI MUTIARA INDAH');
    expect(r5.content).not.toContain('Muatan:** Tujuan: PURI MUTIARA INDAH');
    expect(r5.content).toContain('Muatan:** *(Belum diisi)*');

    // Turn 6: User provides cargo: "Muatan: Besi Beton"
    const r6 = await CopilotEngine.processCommand('Muatan: Besi Beton', context, csIdentityA);
    expect(r6.proposal).toBeUndefined();
    expect(r6.content).toContain('Jumlah / Kuantitas (Qty)');
    expect(r6.content).toContain('Besi Beton');

    // Turn 7: User provides quantity: "20 ton"
    const r7 = await CopilotEngine.processCommand('20 ton', context, csIdentityA);

    // NOW all required fields are complete -> proposal generated!
    expect(r7.proposal).toBeDefined();
    expect(r7.content).toContain('Ringkasan Sales Order (EXECUTE: OFF)');
    expect(r7.content).toContain('Muatan:** Besi Beton');
    expect(r7.content).toContain('Jumlah:** 20 ton');
    expect(r7.content).toContain('Lokasi Tujuan:** PURI MUTIARA INDAH');
  });

  // --------------------------------------------------------------------------
  // Test 22: Standalone destination phrase without prefix does not become cargo
  // --------------------------------------------------------------------------
  it('22. Short answer destination "ke Cikarang" or "Cikarang" does not become cargo', async () => {
    const convoId = 'session-dest-short-22';
    const context = createTestContext(csIdentityA, convoId);

    // Order initiation with customer & service
    await CopilotEngine.processCommand('buat order baru untuk PT TRADING PERDANA SUKSES', context, csIdentityA);
    await CopilotEngine.processCommand('Trucking', context, csIdentityA);

    // Turn: Origin
    await CopilotEngine.processCommand('Asal: Pelabuhan Tanjung Priok', context, csIdentityA);

    // Turn: Destination without "Tujuan:" keyword, e.g. "ke Cikarang Barat"
    const rDest = await CopilotEngine.processCommand('ke Cikarang Barat', context, csIdentityA);
    expect(rDest.proposal).toBeUndefined();
    expect(rDest.content).toContain('Deskripsi Muatan (Cargo)');
    expect(rDest.content).toContain('Muatan:** *(Belum diisi)*');
  });

  // --------------------------------------------------------------------------
  // Test 23: Incomplete draft cannot enter final review / proposal state
  // --------------------------------------------------------------------------
  it('23. Incomplete draft cannot enter final review state or generate proposal', async () => {
    const convoId = 'session-incomplete-guard-23';
    const context = createTestContext(csIdentityA, convoId);

    await CopilotEngine.processCommand('buat order baru untuk PT TRADING PERDANA SUKSES', context, csIdentityA);
    await CopilotEngine.processCommand('Trucking', context, csIdentityA);

    // Input destination only
    const r = await CopilotEngine.processCommand('Tujuan: Surabaya', context, csIdentityA);
    expect(r.proposal).toBeUndefined();
    expect(r.content).toContain('Data yang masih perlu dilengkapi:');
    expect(r.content).toContain('Lokasi Asal (Origin)');
    expect(r.content).toContain('Deskripsi Muatan (Cargo)');
    expect(r.content).toContain('Jumlah / Kuantitas (Qty)');
  });
});
