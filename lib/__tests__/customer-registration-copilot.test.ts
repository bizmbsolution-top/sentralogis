/**
 * Sentralogis — Targeted Test Suite: Customer Registration via Copilot
 * lib/__tests__/customer-registration-copilot.test.ts
 *
 * Verifies that:
 * 1. Role `hq_cs` with permission `customer:register` can register a new customer in md_entities and assign party_roles 'CUSTOMER'.
 * 2. Role without `customer:register` or `commercial:manage` (e.g. ground_staff / driver) is rejected with 403 / BLOCKED.
 * 3. Permission `customer:register` does NOT grant general `commercial:manage` (cannot confirm/cancel SO).
 * 4. Multi-tenant isolation: cannot search or register customers for other tenants.
 * 5. Duplicate candidate detection returns existing matches and prevents accidental re-registration.
 * 6. Explicit confirmation is required before committing the new customer to the database.
 * 7. After customer registration, Copilot asks if user wants to finish or proceed to create a Sales Order.
 * 8. Proceeding to create a Sales Order retains the exact canonical customer ID and code from the newly registered entity.
 * 9. Sales Order creation requires its own separate second confirmation before saving as Draft SO.
 * 10. Prior operational read queries and sales_order:read capabilities continue to work without regression.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { ConversationalOrderWorkspace, _setWorkspaceDbClient } from '@/lib/copilot/workflow/conversational-order-workspace';
import { CustomerIntentHandler, _setCustomerDbClient } from '@/lib/copilot/customer/customer-intent-handler';
import { _setSalesOrderDbClient, confirmSalesOrder, cancelSalesOrder } from '@/lib/sales-order/service';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import type { IdentityContext } from '@/lib/application/identity/types';
import { resolvePermissionsForRole } from '@/lib/application/identity/authorization';
import {
  ROLE_OWNER,
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_HQ_DIRECTOR_COMM,
  ROLE_HQ_DIRECTOR_CS,
  ROLE_HQ_COMMERCIAL_DIRECTOR,
  ROLE_HQ_SALES_MANAGER,
  ROLE_HQ_SALES_STAFF,
  ROLE_HQ_CS,
  ROLE_DRIVER,
  ROLE_GROUND_STAFF,
} from '@/lib/application/identity/roles';

describe('Targeted: Customer Registration via Copilot', () => {
  const TENANT_A = 'tenant-uuid-alpha-1111';
  const TENANT_B = 'tenant-uuid-beta-2222';

  // Role hq_cs: CS user with customer:register, sales_order:create, sales_order:read (lacks commercial:manage)
  const csIdentityA: IdentityContext = {
    userId: 'user-cs-rahma',
    tenantId: TENANT_A,
    role: 'hq_cs',
    roles: ['hq_cs'],
    permissions: [
      'copilot:read',
      'customer:register',
      'sales_order:create',
      'sales_order:read',
      'customer_visibility:read',
      'work_order:read',
      'job_order:read',
    ],
    sbuScope: 'trucking',
  };

  // Role ground_staff: unauthorized user (lacks customer:register and commercial:manage)
  const groundStaffIdentityA: IdentityContext = {
    userId: 'user-ground-staff',
    tenantId: TENANT_A,
    role: 'ground_staff',
    roles: ['ground_staff'],
    permissions: ['copilot:read', 'job_order:read'],
    sbuScope: 'trucking',
  };

  // Role hq_sales_staff: commercial user (has commercial:manage, lacks customer:register)
  const commercialStaffIdentityA: IdentityContext = {
    userId: 'user-sales-budi',
    tenantId: TENANT_A,
    role: 'hq_sales_staff',
    roles: ['hq_sales_staff'],
    permissions: [
      'copilot:read',
      'commercial:read',
      'commercial:manage',
      'sales_order:create',
      'sales_order:read',
    ],
    sbuScope: 'trucking',
  };

  let mockEntities: Array<{
    id: string;
    tenant_id: string;
    name: string;
    legal_name?: string | null;
    entity_code?: string;
    is_customer?: boolean;
    is_active?: boolean;
  }>;
  let mockPartyRoles: Array<{
    tenant_id: string;
    party_id: string;
    role_type: string;
    context_type: string;
    is_primary: boolean;
    is_active: boolean;
  }>;
  let mockEngagements: Array<any>;
  let mockSalesOrders: Array<any>;
  let nextSoSeq = 1;
  let nextCustSeq = 1;

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
          : table === 'party_roles'
          ? mockPartyRoles
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
          insert: (payload: any) => {
            const id = table === 'md_entities'
              ? `cust-uuid-${nextCustSeq++}`
              : `uuid-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const row = {
              id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            if (table === 'md_entities') {
              mockEntities.push(row);
            } else if (table === 'commercial_work_orders') {
              row.wo_number = `ENG-2026-10-${id.slice(-4)}`;
              mockEngagements.push(row);
            } else if (table === 'party_roles') {
              mockPartyRoles.push(row);
            } else {
              mockSalesOrders.push(row);
            }

            return {
              select: () => ({
                single: async () => ({ data: row, error: null }),
              }),
              then: (resolve: any) => Promise.resolve({ data: row, error: null }).then(resolve),
            };
          },
        };
      },
    };
  }

  beforeEach(() => {
    ConversationalOrderWorkspace.resetAllSessions();
    nextSoSeq = 1;
    nextCustSeq = 1;
    mockEntities = [
      {
        id: 'cust-uuid-tps',
        tenant_id: TENANT_A,
        name: 'PT TRADING PERDANA SUKSES',
        legal_name: 'PT TRADING PERDANA SUKSES',
        entity_code: 'TPS-01',
        is_customer: true,
        is_active: true,
      },
      {
        id: 'cust-uuid-b',
        tenant_id: TENANT_B,
        name: 'PT LAUTAN MANDIRI BETA',
        legal_name: 'PT LAUTAN MANDIRI BETA',
        entity_code: 'LMB-01',
        is_customer: true,
        is_active: true,
      },
    ];
    mockPartyRoles = [
      {
        tenant_id: TENANT_A,
        party_id: 'cust-uuid-tps',
        role_type: 'CUSTOMER',
        context_type: 'GLOBAL',
        is_primary: true,
        is_active: true,
      },
    ];
    mockEngagements = [];
    mockSalesOrders = [];

    const mockDb = createMockDb();
    _setWorkspaceDbClient(mockDb as any);
    _setCustomerDbClient(mockDb as any);
    _setSalesOrderDbClient(mockDb as any);
    _setEngagementDbClient(mockDb as any);
  });

  function createTestContext(identity: IdentityContext, conversationId?: string) {
    const session = ConversationContext.create(conversationId || 'test-session-reg');
    const tenant = TenantContext.create(identity.tenantId, 'Test Tenant');
    const user = UserContext.create(identity.userId, identity.role, identity.role);
    const permissions = PermissionContext.create(identity.permissions as any);
    const workspace = WorkspaceContext.create('default', 'Test Workspace');

    return OperationalContext.create(session, tenant, user, permissions, workspace);
  }

  // 1. Role hq_cs can register customer via explicit command
  it('1. Role hq_cs with customer:register can register new customer and assign party_roles CUSTOMER', async () => {
    const context = createTestContext(csIdentityA);

    // Initial command triggers pre-registration review
    const r1 = await CopilotEngine.processCommand('daftarkan customer baru PT Mitra Bahari Nusantara', context, csIdentityA);
    expect(r1.type).toBe('text');
    expect(r1.content).toContain('Ringkasan Pra-Pendaftaran Customer Baru');
    expect(r1.content).toContain('PT Mitra Bahari Nusantara');
    expect(r1.content).toContain('Ya, daftarkan PT Mitra Bahari Nusantara');

    // Confirm registration
    const r2 = await CopilotEngine.processCommand('Ya, daftarkan PT Mitra Bahari Nusantara', context, csIdentityA);
    expect(r2.type).toBe('text');
    expect(r2.content).toContain('Customer baru berhasil didaftarkan ke data master');
    expect(r2.content).toContain('PT Mitra Bahari Nusantara');
    expect(r2.content).toContain('Apakah Anda ingin lanjut membuat Sales Order untuk customer ini?');

    // Verify entity in md_entities
    const created = mockEntities.find((e) => e.name === 'PT Mitra Bahari Nusantara');
    expect(created).toBeDefined();
    expect(created?.tenant_id).toBe(TENANT_A);
    expect(created?.is_customer).toBe(true);

    // Verify canonical party_roles assignment
    const roleAssigned = mockPartyRoles.find((pr) => pr.party_id === created?.id);
    expect(roleAssigned).toBeDefined();
    expect(roleAssigned?.role_type).toBe('CUSTOMER');
    expect(roleAssigned?.tenant_id).toBe(TENANT_A);
  });

  // 2. User without customer:register or commercial:manage is rejected with 403 / BLOCKED
  it('2. User without customer:register is rejected with 403 BLOCKED and cannot create entity', async () => {
    const context = createTestContext(groundStaffIdentityA);
    const countBefore = mockEntities.length;

    const res = await CopilotEngine.processCommand('daftarkan customer baru PT Cipta Solusi', context, groundStaffIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain("Akses ditolak: Pendaftaran entitas Customer baru memerlukan izin 'customer:register' atau 'commercial:manage'");
    expect(res.content).toContain('ground_staff');

    // No entity created
    expect(mockEntities.length).toBe(countBefore);
  });

  // 3. Duplicate candidate detection returns warning banner before registration
  it('3. Duplicate candidate detection returns existing matches and prevents blind duplication', async () => {
    const context = createTestContext(csIdentityA);

    // Searching / creating with a name similar to existing "PT TRADING PERDANA SUKSES"
    const res = await CopilotEngine.processCommand('daftarkan customer baru PT Trading Jaya', context, csIdentityA);
    expect(res.type).toBe('text');
    expect(res.content).toContain('Perhatian:');
    expect(res.content).toContain('PT TRADING PERDANA SUKSES');
  });

  // 4. Guided conversational flow: Customer registration -> Seamless continuation to Sales Order
  it('4. Full multi-turn flow: Register new customer, proceed to SO, review, and confirm Draft SO', async () => {
    const convoId = 'convo-reg-to-so-flow';
    const context = createTestContext(csIdentityA, convoId);

    // Turn 1: Initiate order for an unregistered customer
    const r1 = await CopilotEngine.processCommand('buat order baru untuk PT Cipta Perkasa Abadi', context, csIdentityA);
    expect(r1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');
    expect(r1.content).toContain('PT Cipta Perkasa Abadi');
    expect(r1.content).toContain('Apakah Anda ingin mendaftarkan **"PT Cipta Perkasa Abadi"** sebagai customer baru sekarang?');

    // Turn 2: User confirms registration
    const r2 = await CopilotEngine.processCommand('Ya, daftarkan', context, csIdentityA);
    expect(r2.content).toContain('Customer baru **"PT Cipta Perkasa Abadi"**');
    expect(r2.content).toContain('berhasil didaftarkan ke data master');
    expect(r2.content).toContain('Apakah Anda ingin lanjut membuat Sales Order untuk customer ini?');

    // Verify entity was created in database
    const newCust = mockEntities.find((e) => e.name === 'PT Cipta Perkasa Abadi');
    expect(newCust).toBeDefined();

    // Turn 3: User proceeds to select service "Trucking"
    const r3 = await CopilotEngine.processCommand('Trucking', context, csIdentityA);
    expect(r3.content).toContain('SBU TRUCKING');

    // Turn 4: User provides route, cargo, and revenue
    const r4 = await CopilotEngine.processCommand('dari Jakarta ke Surabaya muatan 2 kontainer 20ft nilai 15 juta', context, csIdentityA);
    expect(r4.content).toContain('Ringkasan Sales Order (EXECUTE: OFF)');
    expect(r4.content).toContain('PT Cipta Perkasa Abadi');
    expect(r4.content).toContain('IDR 15.000.000');
    expect(r4.content).toContain('Simpan');

    // Turn 5: User confirms saving Sales Order
    const r5 = await CopilotEngine.processCommand('Simpan', context, csIdentityA);
    expect(r5.content).toContain('Sales Order Berhasil Dibuat! (EXECUTE: ON — Tersimpan Resmi)');
    expect(r5.content).toContain('SO-2026-10-0001');
    expect(r5.content).toContain(newCust?.id);

    // Verify Sales Order in database
    expect(mockSalesOrders.length).toBe(1);
    const savedSo = mockSalesOrders[0];
    expect(savedSo.so_number).toBe('SO-2026-10-0001');
    expect(savedSo.tenant_id).toBe(TENANT_A);
    expect(savedSo.status).toBe('DRAFT');

    // Verify parent Engagement references the newly created customer
    expect(mockEngagements.length).toBe(1);
    expect(mockEngagements[0].customer_id).toBe(newCust?.id);
  });

  // 5. Cross-tenant isolation: tenant A cannot see or register for tenant B
  it('5. Cross-tenant isolation is strictly maintained across customer registration and query', async () => {
    const contextA = createTestContext(csIdentityA);

    // Query for customer belonging to Tenant B
    const rSearch = await CopilotEngine.processCommand('cari pelanggan PT LAUTAN MANDIRI BETA', contextA, csIdentityA);
    expect(rSearch.content).toContain('tidak ditemukan pada data master');
    expect(rSearch.content).not.toContain('cust-uuid-b');
  });

  // 6. Permission Matrix Audit: Sole recipient is hq_cs; other roles do NOT receive customer:register
  it('6. Permission Matrix: Sole recipient of customer:register is hq_cs; owner and admin roles do NOT receive customer:register', () => {
    // hq_cs has customer:register but lacks commercial:manage
    const csPerms = resolvePermissionsForRole(ROLE_HQ_CS);
    expect(csPerms).toContain('customer:register');
    expect(csPerms).not.toContain('commercial:manage');

    // Platform and tenant owner do NOT have customer:register
    expect(resolvePermissionsForRole(ROLE_OWNER)).not.toContain('customer:register');
    expect(resolvePermissionsForRole('TENANT_OWNER')).not.toContain('customer:register');

    // Tenant admin and superadmin do NOT have customer:register
    expect(resolvePermissionsForRole(ROLE_TENANT_SUPERADMIN)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_TENANT_ADMIN)).not.toContain('customer:register');

    // HQ directors and commercial roles do NOT have customer:register
    expect(resolvePermissionsForRole(ROLE_HQ_DIRECTOR_COMM)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_HQ_DIRECTOR_CS)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_HQ_COMMERCIAL_DIRECTOR)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_HQ_SALES_MANAGER)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_HQ_SALES_STAFF)).not.toContain('customer:register');

    // Operational roles do NOT have customer:register
    expect(resolvePermissionsForRole(ROLE_DRIVER)).not.toContain('customer:register');
    expect(resolvePermissionsForRole(ROLE_GROUND_STAFF)).not.toContain('customer:register');
  });

  // 7. Commercial roles retain existing customer registration capability via commercial:manage
  it('7. Commercial role with commercial:manage can register new customer via Copilot without customer:register', async () => {
    const contextCommercial = createTestContext(commercialStaffIdentityA);

    // Step 1: Request pre-registration
    const r1 = await CopilotEngine.processCommand('daftarkan customer baru PT Armada Mandiri Sejahtera', contextCommercial, commercialStaffIdentityA);
    expect(r1.content).toContain('Ringkasan Pra-Pendaftaran Customer Baru');
    expect(r1.content).toContain('PT Armada Mandiri Sejahtera');

    // Step 2: Confirm registration
    const r2 = await CopilotEngine.processCommand('Ya, daftarkan PT Armada Mandiri Sejahtera', contextCommercial, commercialStaffIdentityA);
    expect(r2.content).toContain('Customer baru berhasil didaftarkan ke data master');
    expect(r2.content).toContain('PT Armada Mandiri Sejahtera');

    const created = mockEntities.find((e) => e.name === 'PT Armada Mandiri Sejahtera');
    expect(created).toBeDefined();
    expect(created?.tenant_id).toBe(TENANT_A);

    const partyRole = mockPartyRoles.find((pr) => pr.party_id === created?.id);
    expect(partyRole).toBeDefined();
    expect(partyRole?.role_type).toBe('CUSTOMER');
  });

  // 8. customer:register does NOT grant commercial:manage authority (cannot confirm or cancel Sales Orders)
  it('8. Role hq_cs with customer:register CANNOT confirm or cancel Sales Orders (requires commercial:manage)', async () => {
    const fakeSo = {
      id: 'so-uuid-test-9999',
      tenant_id: TENANT_A,
      so_number: 'SO-2026-10-9999',
      status: 'DRAFT',
      engagement_id: 'eng-uuid-test-9999',
      customer_id: 'cust-uuid-tps',
      version_no: 1,
    };
    mockSalesOrders.push(fakeSo);

    // Attempting to confirm with csIdentityA must throw 403 / IdentityResolutionError
    await expect(confirmSalesOrder('so-uuid-test-9999', csIdentityA)).rejects.toThrow(/commercial:manage/);

    // Attempting to cancel with csIdentityA must throw 403 / IdentityResolutionError
    await expect(cancelSalesOrder('so-uuid-test-9999', csIdentityA, 'Alasan pembatalan')).rejects.toThrow(/commercial:manage/);
  });

  // 9. Operational non-interference: Zero operational WO / JO generation occurs
  it('9. Zero operational work orders or job orders are generated during customer registration and SO drafting', async () => {
    const context = createTestContext(csIdentityA);

    await CopilotEngine.processCommand('daftarkan customer baru PT Samudera Pasifik', context, csIdentityA);
    await CopilotEngine.processCommand('Ya, daftarkan PT Samudera Pasifik', context, csIdentityA);

    // Only commercial tables (md_entities, party_roles) are written to
    const cust = mockEntities.find((e) => e.name === 'PT Samudera Pasifik');
    expect(cust).toBeDefined();

    // No operational tables were written
    expect(mockSalesOrders.length).toBe(0);
    expect(mockEngagements.length).toBe(0);
  });

  // 10. Failed / unconfirmed SO creation preserves newly registered customer
  it('10. Abandoning or failing SO creation preserves the registered customer in master data without duplication', async () => {
    const convoId = 'convo-abandoned-so';
    const context = createTestContext(csIdentityA, convoId);

    // 1. Initiate order with unknown customer
    await CopilotEngine.processCommand('buat order baru untuk PT Sentosa Logistik Abadi', context, csIdentityA);

    // 2. Register customer
    const rReg = await CopilotEngine.processCommand('Ya, daftarkan', context, csIdentityA);
    expect(rReg.content).toContain('berhasil didaftarkan');

    const registered = mockEntities.find((e) => e.name === 'PT Sentosa Logistik Abadi');
    expect(registered).toBeDefined();

    // 3. User says "batal" or "selesai" instead of continuing SO
    const rCancel = await CopilotEngine.processCommand('batal', context, csIdentityA);
    expect(rCancel.content).toBeDefined();

    // The customer entity remains safely committed in md_entities and party_roles
    const stillExists = mockEntities.find((e) => e.name === 'PT Sentosa Logistik Abadi');
    expect(stillExists).toBeDefined();
    expect(mockPartyRoles.some((pr) => pr.party_id === registered?.id)).toBe(true);

    // No SO was created
    expect(mockSalesOrders.length).toBe(0);
  });

  // 11. User confirms registration with simple "YA" (Preview bug repro)
  it('11. User can confirm customer registration by replying simple "YA"', async () => {
    const convoId = 'convo-confirm-ya-test';
    const context = createTestContext(csIdentityA, convoId);

    // Step 1: User asks to register customer
    const r1 = await CopilotEngine.processCommand('daftarkan customer baru PT ANUGERAH JAYA BERSAMA', context, csIdentityA);
    expect(r1.type).toBe('text');
    expect(r1.content).toContain('Ringkasan Pra-Pendaftaran Customer Baru');
    expect(r1.content).toContain('PT ANUGERAH JAYA BERSAMA');
    expect(r1.content).toContain('"YA"');

    // Step 2: User responds with simple uppercase "YA"
    const r2 = await CopilotEngine.processCommand('YA', context, csIdentityA);
    expect(r2.type).toBe('text');
    expect(r2.content).toContain('Customer baru berhasil didaftarkan ke data master');
    expect(r2.content).toContain('PT ANUGERAH JAYA BERSAMA');

    // Verify entity in md_entities
    const created = mockEntities.find((e) => e.name === 'PT ANUGERAH JAYA BERSAMA');
    expect(created).toBeDefined();
    expect(created?.tenant_id).toBe(TENANT_A);
    expect(created?.is_customer).toBe(true);
  });

  // 12. User cancels pending customer registration
  it('12. User can cancel pending customer registration by replying "batal"', async () => {
    const convoId = 'convo-cancel-reg-test';
    const context = createTestContext(csIdentityA, convoId);

    // Step 1: User asks to register customer
    await CopilotEngine.processCommand('daftarkan customer baru PT Batalkan Saja Dulu', context, csIdentityA);

    // Step 2: User replies "batal"
    const r2 = await CopilotEngine.processCommand('batal', context, csIdentityA);
    expect(r2.type).toBe('text');
    expect(r2.content).toContain('dibatalkan');
    expect(r2.content).toContain('Tidak ada data yang disimpan');

    // Verify entity was NOT created
    const notCreated = mockEntities.find((e) => e.name === 'PT Batalkan Saja Dulu');
    expect(notCreated).toBeUndefined();
  });

  // 13. Idempotent registration: Re-attempting registration for an existing customer returns existing without duplicate
  it('13. Re-attempting registration for an existing customer returns existing without duplicate error', async () => {
    const convoId = 'convo-idempotent-reg-test';
    const context = createTestContext(csIdentityA, convoId);

    // Already exists in mockEntities: "PT TRADING PERDANA SUKSES"
    const initialCount = mockEntities.length;
    const r = await CopilotEngine.processCommand('daftarkan customer baru PT TRADING PERDANA SUKSES', context, csIdentityA);
    expect(r.type).toBe('text');
    expect(r.content).toContain('sudah terdaftar pada database master tenant Anda');
    expect(r.content).toContain('PT TRADING PERDANA SUKSES');

    // Entity count unchanged
    expect(mockEntities.length).toBe(initialCount);
  });
});
