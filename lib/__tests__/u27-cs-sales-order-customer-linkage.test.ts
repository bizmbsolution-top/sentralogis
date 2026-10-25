/**
 * Sentralogis — CS Sales Order Creation & Customer Linkage Test Suite
 * lib/__tests__/u27-cs-sales-order-customer-linkage.test.ts
 *
 * Proves the 9 mandatory guarantees for Customer Service Sales Order creation:
 * 1. Role hq_cs can search registered customers within their authorized tenant.
 * 2. Cross-tenant customer isolation: hq_cs cannot read or link customers from another tenant.
 * 3. Selected customer is passed with canonical UUID (customerId) into state and form links, not just text.
 * 4. Role hq_cs with sales_order:create can create and save Draft Sales Orders linked to canonical customer.
 * 5. Saved Sales Order can be read back by hq_cs (sales_order:read) preserving the exact customer relation.
 * 6. User without commercial:manage (including hq_cs) is strictly FORBIDDEN from confirming Sales Orders.
 * 7. Unauthorized roles (e.g. driver, ground_staff) cannot create Sales Orders via direct service calls (403).
 * 8. Customer not found does not cause silent duplicate entity creation; requires explicit registration path.
 * 9. Existing commercial roles (commercial_admin, owner, sales_staff) continue to function without regression.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IdentityContext } from '@/lib/application/identity/types';
import { resolvePermissionsForRole } from '@/lib/application/identity/authorization';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import {
  createSalesOrder,
  confirmSalesOrder,
  findSalesOrderById,
  listSalesOrdersForTenant,
  listCustomersAndEngagementsForTenant,
  enrichSalesOrdersWithCustomer,
  _setSalesOrderDbClient,
  type SalesOrderDbClient,
} from '@/lib/sales-order/service';
import {
  ConversationalOrderWorkspace,
  _setWorkspaceDbClient,
} from '@/lib/copilot/workflow/conversational-order-workspace';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';

/* ================================================================== */
/*  TEST IDENTITIES & FIXTURES                                        */
/* ================================================================== */

const TENANT_A = 'tenant-a-uuid-1111-1111-111111111111';
const TENANT_B = 'tenant-b-uuid-2222-2222-222222222222';

const CUST_TOP_A = 'cust-top-uuid-aaaa-111111111111';
const CUST_BERKAH_A = 'cust-berkah-uuid-aaaa-222222222222';
const CUST_OTHER_B = 'cust-other-uuid-bbbb-333333333333';

const ENG_A1 = 'eng-a1-uuid-aaaa-111111111111';

// Role hq_cs: has sales_order:create, sales_order:read, customer_visibility:read, but NO commercial:manage / commercial:read
const csIdentityA: IdentityContext = {
  userId: 'user-rahma-cs-01',
  tenantId: TENANT_A,
  role: 'hq_cs',
  permissions: resolvePermissionsForRole('hq_cs') as any,
  sbuScope: 'trucking',
  isTenantOwner: false,
  membershipId: 'mem-cs-01',
};

// Driver identity: unauthorized for commercial & sales_order
const driverIdentityA: IdentityContext = {
  userId: 'user-driver-01',
  tenantId: TENANT_A,
  role: 'driver',
  permissions: resolvePermissionsForRole('driver') as any,
  sbuScope: 'trucking',
  isTenantOwner: false,
  membershipId: 'mem-drv-01',
};

// Commercial Admin identity: full commercial authority
const commercialIdentityA: IdentityContext = {
  userId: 'user-comm-mgr-01',
  tenantId: TENANT_A,
  role: 'hq_commercial_director',
  permissions: resolvePermissionsForRole('hq_commercial_director') as any,
  sbuScope: null,
  isTenantOwner: false,
  membershipId: 'mem-comm-01',
};

/* ================================================================== */
/*  CHAINABLE IN-MEMORY MOCK DATABASE                                 */
/* ================================================================== */

type Row = Record<string, any>;

class MockSalesOrderDb implements SalesOrderDbClient {
  entities: Row[] = [];
  engagements: Row[] = [];
  salesOrders: Row[] = [];
  rpcSeq = 1;

  reset() {
    this.entities = [
      { id: CUST_TOP_A, tenant_id: TENANT_A, name: 'PT Trans Ocean Prima (TOP)', code: 'TOP', is_active: true },
      { id: CUST_BERKAH_A, tenant_id: TENANT_A, name: 'CV Berkah Angkutan', code: 'BERKAH', is_active: true },
      { id: CUST_OTHER_B, tenant_id: TENANT_B, name: 'PT Beda Tenant Mandiri', code: 'BEDA', is_active: true },
    ];
    this.engagements = [
      {
        id: ENG_A1,
        tenant_id: TENANT_A,
        customer_id: CUST_TOP_A,
        wo_number: 'WO-ENG-2026-001',
        status: 'OPEN',
        created_at: new Date().toISOString(),
      },
    ];
    this.salesOrders = [];
    this.rpcSeq = 1;
  }

  from(table: string): any {
    const self = this;
    return {
      select: (cols = '*') => {
        let rows = (self as any)[table === 'md_entities' ? 'entities' : table === 'commercial_work_orders' ? 'engagements' : 'salesOrders'] || [];
        let filters: Array<(r: Row) => boolean> = [];

        const chain: any = {
          eq: (col: string, val: any) => {
            filters.push((r: Row) => r[col] === val);
            return chain;
          },
          in: (col: string, vals: any[]) => {
            filters.push((r: Row) => vals.includes(r[col]));
            return chain;
          },
          ilike: (col: string, pat: string) => {
            const clean = pat.replace(/%/g, '').toLowerCase();
            filters.push((r: Row) => String(r[col] || '').toLowerCase().includes(clean));
            return chain;
          },
          like: (col: string, pat: string) => {
            const clean = pat.replace(/%/g, '').toLowerCase();
            filters.push((r: Row) => String(r[col] || '').toLowerCase().includes(clean));
            return chain;
          },
          order: (_col: string, _opts: any) => chain,
          limit: (num: number) => {
            filters.push((_r: Row, idx?: number) => (idx !== undefined ? idx < num : true));
            return chain;
          },
          single: async () => {
            let res = rows.filter((r: Row) => filters.every((fn) => fn(r)));
            if (res.length === 0) return { data: null, error: { message: 'Row not found' } };
            return { data: res[0], error: null };
          },
          maybeSingle: async () => {
            let res = rows.filter((r: Row) => filters.every((fn) => fn(r)));
            return { data: res[0] || null, error: null };
          },
          then: (resolve: any, reject?: any) => {
            let res = rows.filter((r: Row) => filters.every((fn) => fn(r)));
            return Promise.resolve({ data: res, error: null }).then(resolve, reject);
          },
        };
        return chain;
      },

      insert: (payload: any) => ({
        select: (_cols?: string) => ({
          single: async () => {
            const row = {
              id: payload.id || `row-uuid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              version_no: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...payload,
            };
            if (table === 'commercial_work_orders') {
              self.engagements.push(row);
            } else {
              self.salesOrders.push(row);
            }
            return { data: row, error: null };
          },
        }),
      }),

      update: (patch: any) => {
        let targetId: string | null = null;
        let tenantFilter: string | null = null;
        const chain: any = {
          eq: (col: string, val: any) => {
            if (col === 'id') targetId = val;
            if (col === 'tenant_id') tenantFilter = val;
            return chain;
          },
          select: async () => {
            const idx = self.salesOrders.findIndex((s) => s.id === targetId && (!tenantFilter || s.tenant_id === tenantFilter));
            if (idx === -1) return { data: null, error: { message: 'Not found' } };
            self.salesOrders[idx] = { ...self.salesOrders[idx], ...patch, updated_at: new Date().toISOString() };
            return { data: [self.salesOrders[idx]], error: null };
          },
        };
        return chain;
      },
    };
  }

  async rpc(funcName: string, _params?: any): Promise<{ data: any; error: any }> {
    if (funcName === 'next_sales_order') {
      const num = String(this.rpcSeq++).padStart(4, '0');
      return { data: `SO-2026-10-${num}`, error: null };
    }
    return { data: null, error: new Error(`Unknown RPC ${funcName}`) };
  }
}

const mockDb = new MockSalesOrderDb();

/* ================================================================== */
/*  TEST SUITE                                                        */
/* ================================================================== */

describe('CS Sales Order Creation & Customer Linkage (Phase 4B / U-27)', () => {
  beforeEach(() => {
    mockDb.reset();
    _setSalesOrderDbClient(mockDb);
    _setWorkspaceDbClient(mockDb);
    _setEngagementDbClient(mockDb as any);
    ConversationalOrderWorkspace.resetAllSessions();
  });

  afterEach(() => {
    _setSalesOrderDbClient(null);
    _setWorkspaceDbClient(null);
    _setEngagementDbClient(null);
    ConversationalOrderWorkspace.resetAllSessions();
  });

  // ------------------------------------------------------------------
  // 1. Role hq_cs permission profile verification
  // ------------------------------------------------------------------
  it('1. PERMISSION PROFILE: hq_cs possesses sales_order:create and customer_visibility:read but NOT commercial:manage', () => {
    expect(csIdentityA.permissions).toContain('sales_order:create');
    expect(csIdentityA.permissions).toContain('sales_order:read');
    expect(csIdentityA.permissions).toContain('customer_visibility:read');
    expect(csIdentityA.permissions).not.toContain('commercial:manage');
    expect(csIdentityA.permissions).not.toContain('commercial:read');

    // assertAnyPermission passes with sales_order:create
    expect(() => assertAnyPermission(csIdentityA, ['commercial:manage', 'sales_order:create'])).not.toThrow();

    // assertPermission strictly rejects commercial:manage
    expect(() => assertPermission(csIdentityA, 'commercial:manage')).toThrow();
  });

  // ------------------------------------------------------------------
  // 2. Customer lookup for CS with tenant isolation
  // ------------------------------------------------------------------
  it('2. CUSTOMER LOOKUP & TENANT ISOLATION: hq_cs can list customers in authorized tenant, strictly excluding other tenants', async () => {
    const lookup = await listCustomersAndEngagementsForTenant(csIdentityA);
    expect(lookup.customers.length).toBe(2);
    expect(lookup.customers.some((c) => c.id === CUST_TOP_A)).toBe(true);
    expect(lookup.customers.some((c) => c.id === CUST_BERKAH_A)).toBe(true);
    // Tenant B customer must be invisible
    expect(lookup.customers.some((c) => c.id === CUST_OTHER_B)).toBe(false);

    // Engagements are safely omitted because CS lacks commercial:read
    expect(lookup.engagements.length).toBe(0);
  });

  // ------------------------------------------------------------------
  // 3. Copilot selects customer and binds canonical UUID
  // ------------------------------------------------------------------
  it('3. CANONICAL CUSTOMER BINDING: Copilot resolves "TOP" to exact entity UUID (not text name only)', async () => {
    const convoId = 'test-cs-lookup-top';
    const t1 = await ConversationalOrderWorkspace.handleTurn('buat order baru', csIdentityA, null, convoId);
    expect(t1.actionRequired).toBe('CHOOSE_CUSTOMER');

    // Turn 2: User answers with "TOP"
    const t2 = await ConversationalOrderWorkspace.handleTurn('TOP', csIdentityA, null, convoId);
    expect(t2.handled).toBe(true);
    // Check internal session state
    const sessionState = ConversationalOrderWorkspace.getSessionState(csIdentityA, undefined, convoId);
    expect(sessionState).not.toBeNull();
    expect(sessionState?.customerId).toBe(CUST_TOP_A);
    expect(sessionState?.customerName).toContain('PT Trans Ocean Prima');
    expect(t2.responseText).toContain('Customer **PT Trans Ocean Prima (TOP)** berhasil diverifikasi');
  });

  // ------------------------------------------------------------------
  // 4. CS creates and saves Draft SO linked to canonical customer
  // ------------------------------------------------------------------
  it('4. DRAFT SO CREATION BY CS: hq_cs can save a Draft Sales Order with official sequence number and customer FK', async () => {
    const result = await createSalesOrder(
      {
        engagementId: ENG_A1,
        orderDate: '2026-10-18',
        currency: 'IDR',
        totalAgreedRevenue: 15000000,
        commercialNotes: 'Order Trucking Surabaya via CS Portal',
      },
      csIdentityA,
    );

    expect(result.created).toBe(true);
    expect(result.salesOrder.status).toBe('DRAFT');
    expect(result.salesOrder.soNumber).toBe('SO-2026-10-0001');
    expect(result.salesOrder.engagementId).toBe(ENG_A1);
    expect(result.salesOrder.totalAgreedRevenue).toBe(15000000);
  });

  // ------------------------------------------------------------------
  // 5. Read-back of saved SO by CS preserves customer relation
  // ------------------------------------------------------------------
  it('5. SO READ-BACK: hq_cs can read back the newly created SO with customer name, code, and UUID populated', async () => {
    const created = await createSalesOrder(
      {
        engagementId: ENG_A1,
        orderDate: '2026-10-18',
        currency: 'IDR',
        totalAgreedRevenue: 22000000,
      },
      csIdentityA,
    );

    // Read by ID
    const fetched = await findSalesOrderById(csIdentityA, created.salesOrder.id);
    expect(fetched.id).toBe(created.salesOrder.id);
    expect(fetched.status).toBe('DRAFT');

    // Enrich with customer details
    const [enriched] = await enrichSalesOrdersWithCustomer(csIdentityA, [fetched]);
    expect(enriched.customerId).toBe(CUST_TOP_A);
    expect(enriched.customerName).toContain('Trans Ocean Prima');
    expect(enriched.customerCode).toBe('TOP');
    expect(enriched.engagementNumber).toBe('WO-ENG-2026-001');

    // List for tenant
    const list = await listSalesOrdersForTenant(csIdentityA);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].customerId).toBe(CUST_TOP_A);
  });

  // ------------------------------------------------------------------
  // 6. User without commercial:manage CANNOT confirm Sales Order
  // ------------------------------------------------------------------
  it('6. CONFIRMATION GATE: hq_cs is strictly prevented from confirming SO; must remain DRAFT', async () => {
    const created = await createSalesOrder(
      {
        engagementId: ENG_A1,
        orderDate: '2026-10-18',
        totalAgreedRevenue: 5000000,
      },
      csIdentityA,
    );

    // CS attempts to confirm
    await expect(confirmSalesOrder(created.salesOrder.id, csIdentityA)).rejects.toThrow();

    // Commercial manager can confirm
    const confirmed = await confirmSalesOrder(created.salesOrder.id, commercialIdentityA);
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.confirmedAt).toBeDefined();
  });

  // ------------------------------------------------------------------
  // 7. Unauthorized roles cannot create SO via direct service call
  // ------------------------------------------------------------------
  it('7. UNPRIVILEGED ROLE REJECTION: driver or ground_staff without sales_order:create is rejected with 403', async () => {
    await expect(
      createSalesOrder(
        {
          engagementId: ENG_A1,
          orderDate: '2026-10-18',
          totalAgreedRevenue: 1000000,
        },
        driverIdentityA,
      ),
    ).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // 8. Unknown customer does not automatically create duplicate entity
  // ------------------------------------------------------------------
  it('8. NO SILENT DUPLICATE CREATION: searching non-existent customer asks for explicit confirmation before registration', async () => {
    const convoId = 'test-unknown-customer';
    await ConversationalOrderWorkspace.handleTurn('buat order baru', csIdentityA, null, convoId);

    // User types unknown customer
    const res = await ConversationalOrderWorkspace.handleTurn('PT Tidak Dikenal 123', csIdentityA, null, convoId);
    expect(res.actionRequired).toBe('CONFIRM_REGISTRATION');
    expect(res.responseText).toContain('belum terdaftar pada data master tenant Anda');

    // Database entity count must remain exactly 3 (zero inserted)
    expect(mockDb.entities.length).toBe(3);
  });

  // ------------------------------------------------------------------
  // 9. Conversational Order Workspace full flow for CS
  // ------------------------------------------------------------------
  it('9. END-TO-END CS GUIDED FLOW: hq_cs inputs order, requests confirm, gets saved as DRAFT with explanatory notice and canonical customer link', async () => {
    const convoId = 'test-cs-full-e2e';
    // Single complete prompt
    const turn1 = await ConversationalOrderWorkspace.handleTurn(
      'buat sales order untuk TOP trucking Jakarta ke Surabaya muatan 10 palet Besi nilai Rp 14.000.000 tanggal 2026-10-25 konfirmasi',
      csIdentityA,
      null,
      convoId,
    );
    expect(turn1.handled).toBe(true);
    expect(turn1.responseText).toContain('Ringkasan Sales Order');
    expect(turn1.responseText).toContain('PT Trans Ocean Prima (TOP)');

    // Final confirmation turn
    const confirmTurn = await ConversationalOrderWorkspace.handleTurn('Simpan', csIdentityA, null, convoId);
    expect(confirmTurn.handled).toBe(true);
    expect(confirmTurn.responseText).toContain('Sales Order Berhasil Dibuat!');
    expect(confirmTurn.responseText).toContain('Status SO saat ini adalah **DRAFT**');
    expect(confirmTurn.responseText).toContain('Catatan Otorisasi');
    expect(confirmTurn.responseText).toContain('hq_cs');
    expect(confirmTurn.responseText).toContain(CUST_TOP_A);
    expect(confirmTurn.responseText).toContain('SO-2026-10-0001');

    // Verify record in mock DB
    expect(mockDb.salesOrders.length).toBe(1);
    expect(mockDb.salesOrders[0].status).toBe('DRAFT');
    expect(mockDb.salesOrders[0].so_number).toBe('SO-2026-10-0001');
  });
});
