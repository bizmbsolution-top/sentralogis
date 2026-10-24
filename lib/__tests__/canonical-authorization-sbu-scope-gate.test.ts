/**
 * SENTRALOGIS — CANONICAL AUTHORIZATION & DATA SCOPE IMPLEMENTATION GATE — PHASE 1
 * lib/__tests__/canonical-authorization-sbu-scope-gate.test.ts
 *
 * Validates canonical authorization enforcement for:
 * - Decision A: Domain-specific READ permissions (work_order:read, job_order:read, commercial:read, shipment:read)
 * - Decision B: SBU-scoped record visibility (TR, WH, CL, FWD scoped, cross-SBU tenant-wide, null/unknown SBU handling)
 * - Centralized authorization chain & Copilot inheritance
 * - Zero mutation safety
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import type { IdentityContext, SbuType } from '@/lib/application/identity/types';
import {
  ROLE_OWNER,
  ROLE_TENANT_ADMIN,
  ROLE_HQ_DIRECTOR_OPS,
  ROLE_SBU_MANAGER_TR,
  ROLE_SBU_OPS_TR,
  ROLE_SBU_MANAGER_WH,
  ROLE_SBU_OPS_WH,
  ROLE_SBU_MANAGER_CL,
  ROLE_SBU_MANAGER_FWD,
  ROLE_DRIVER,
  ROLE_GROUND_STAFF,
  hasCrossSbuAuthority,
  sbuScopeToOperationalType,
} from '@/lib/application/identity/roles';
import {
  findWorkOrderById,
  findWorkOrderViewById,
  listWorkOrderItems,
  listJobOrdersForWorkOrderItem,
  findJobOrderById,
  getWorkOrderExecutionView,
  enrichJobOrdersWithEntityNames,
  _setWorkOrderDbClient,
  type WorkOrderDbClient,
} from '@/lib/work-order/service';
import {
  OperationalLiveReadGateway,
  _setOperationalReadDelegate,
  type OperationalReadDelegate,
} from '@/lib/copilot/read/operational-live-read-gateway';
import type { ConversationalQueryContext } from '@/lib/copilot/sandbox/types';

// ============================================================================
// IN-MEMORY MOCK DATABASE CLIENT FOR WORK ORDER READ SERVICE
// ============================================================================

interface MockRow extends Record<string, unknown> {}

class MockDbStore {
  private tables: Map<string, MockRow[]> = new Map();

  setTableData(table: string, rows: MockRow[]) {
    this.tables.set(table, [...rows]);
  }

  createClient(): WorkOrderDbClient {
    const store = this.tables;

    return {
      from(table: string) {
        let filters: Array<(row: MockRow) => boolean> = [];
        let orderCol: string | null = null;
        let orderAsc: boolean = true;

        const chain: any = {
          select(_cols?: string) {
            return chain;
          },
          eq(col: string, val: unknown) {
            filters.push((row) => row[col] === val);
            return chain;
          },
          in(col: string, vals: unknown[]) {
            filters.push((row) => vals.includes(row[col]));
            return chain;
          },
          is(col: string, val: unknown | null) {
            filters.push((row) => row[col] === val);
            return chain;
          },
          not(col: string, _op: string, val: string) {
            filters.push((row) => row[col] !== val);
            return chain;
          },
          order(col: string, opts: { ascending: boolean }) {
            orderCol = col;
            orderAsc = opts.ascending;
            return chain;
          },
          range(_start: number, _end: number) {
            return chain;
          },
          async maybeSingle() {
            const all = store.get(table) || [];
            const filtered = all.filter((r) => filters.every((f) => f(r)));
            if (filtered.length === 0) {
              return { data: null, error: null };
            }
            return { data: { ...filtered[0] }, error: null };
          },
          async single() {
            const all = store.get(table) || [];
            const filtered = all.filter((r) => filters.every((f) => f(r)));
            if (filtered.length === 0) {
              return { data: null, error: { message: 'Row not found' } };
            }
            return { data: { ...filtered[0] }, error: null };
          },
          then(resolve: (result: { data: MockRow[] | null; error: null }) => any) {
            const all = store.get(table) || [];
            let filtered = all.filter((r) => filters.every((f) => f(r)));
            if (orderCol) {
              filtered.sort((a, b) => {
                const av = String(a[orderCol!] ?? '');
                const bv = String(b[orderCol!] ?? '');
                return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
              });
            }
            return Promise.resolve({ data: filtered.map((r) => ({ ...r })), error: null }).then(resolve);
          },
          insert() {
            throw new Error('MUTATION FORBIDDEN IN READ GATEWAY');
          },
          update() {
            throw new Error('MUTATION FORBIDDEN IN READ GATEWAY');
          },
          delete() {
            throw new Error('MUTATION FORBIDDEN IN READ GATEWAY');
          },
        };

        return chain;
      },
    };
  }
}

// ============================================================================
// CONTEXT BUILDERS
// ============================================================================

function createContext(overrides: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: 'usr-auth-001',
    tenantId: 'tenant-alpha-001',
    tenantCode: 'TNT-ALPHA',
    membershipId: 'mem-001',
    role: ROLE_TENANT_ADMIN,
    isTenantOwner: false,
    permissions: ['work_order:read', 'job_order:read', 'commercial:read', 'shipment:read'],
    sbuScope: null,
    ...overrides,
  };
}

// ============================================================================
// TEST FIXTURES ACROSS TENANTS AND SBUS
// ============================================================================

const TENANT_A = 'tenant-alpha-001';
const TENANT_B = 'tenant-bravo-002';

const MOCK_WORK_ORDERS: MockRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: TENANT_A,
    wo_number: 'WO-A-TR-001',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    tenant_id: TENANT_A,
    wo_number: 'WO-A-WH-002',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    tenant_id: TENANT_A,
    wo_number: 'WO-A-CL-003',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    tenant_id: TENANT_A,
    wo_number: 'WO-A-FWD-004',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    tenant_id: TENANT_A,
    wo_number: 'WO-A-UNKNOWN-005',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000099',
    tenant_id: TENANT_B,
    wo_number: 'WO-B-TR-099',
    status: 'draft',
    order_date: '2026-10-01',
    execution_date: '2026-10-02',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
];

const MOCK_WO_ITEMS: MockRow[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    tenant_id: TENANT_A,
    wo_id: '00000000-0000-0000-0000-000000000001',
    item_code: 'ITEM-TR-1',
    sbu_type: 'TRUCKING',
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    tenant_id: TENANT_A,
    wo_id: '00000000-0000-0000-0000-000000000002',
    item_code: 'ITEM-WH-1',
    sbu_type: 'WAREHOUSE',
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    tenant_id: TENANT_A,
    wo_id: '00000000-0000-0000-0000-000000000003',
    item_code: 'ITEM-CL-1',
    sbu_type: 'CLEARANCE',
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    tenant_id: TENANT_A,
    wo_id: '00000000-0000-0000-0000-000000000004',
    item_code: 'ITEM-FWD-1',
    sbu_type: 'FORWARDING',
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    tenant_id: TENANT_A,
    wo_id: '00000000-0000-0000-0000-000000000005',
    item_code: 'ITEM-UNK-1',
    sbu_type: null,
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000099',
    tenant_id: TENANT_B,
    wo_id: '00000000-0000-0000-0000-000000000099',
    item_code: 'ITEM-B-1',
    sbu_type: 'TRUCKING',
    status: 'pending',
    created_at: '2026-10-01T00:00:00Z',
  },
];

const MOCK_JOB_ORDERS: MockRow[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    tenant_id: TENANT_A,
    wo_item_id: '10000000-0000-0000-0000-000000000001',
    jo_number: 'JO-A-TR-001',
    status: 'pending',
    sbu_type: 'TRUCKING',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    tenant_id: TENANT_A,
    wo_item_id: '10000000-0000-0000-0000-000000000002',
    jo_number: 'JO-A-WH-002',
    status: 'pending',
    sbu_type: 'WAREHOUSE',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    tenant_id: TENANT_A,
    wo_item_id: '10000000-0000-0000-0000-000000000003',
    jo_number: 'JO-A-CL-003',
    status: 'pending',
    sbu_type: 'CLEARANCE',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    tenant_id: TENANT_A,
    wo_item_id: '10000000-0000-0000-0000-000000000004',
    jo_number: 'JO-A-FWD-004',
    status: 'pending',
    sbu_type: 'FORWARDING',
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    tenant_id: TENANT_A,
    wo_item_id: '10000000-0000-0000-0000-000000000005',
    jo_number: 'JO-A-NULL-005',
    status: 'pending',
    sbu_type: null,
    created_at: '2026-10-01T00:00:00Z',
  },
  {
    id: '20000000-0000-0000-0000-000000000099',
    tenant_id: TENANT_B,
    wo_item_id: '10000000-0000-0000-0000-000000000099',
    jo_number: 'JO-B-TR-099',
    status: 'pending',
    sbu_type: 'TRUCKING',
    created_at: '2026-10-01T00:00:00Z',
  },
];

describe('SENTRALOGIS — Canonical Authorization & SBU Data Scope Gate (Phase 1)', () => {
  let mockStore: MockDbStore;

  beforeEach(() => {
    mockStore = new MockDbStore();
    mockStore.setTableData('work_orders', MOCK_WORK_ORDERS);
    mockStore.setTableData('wo_items', MOCK_WO_ITEMS);
    mockStore.setTableData('job_orders', MOCK_JOB_ORDERS);
    mockStore.setTableData('md_entities', []);
    mockStore.setTableData('md_fleets', []);
    mockStore.setTableData('md_drivers', []);

    _setWorkOrderDbClient(mockStore.createClient());
  });

  afterEach(() => {
    _setWorkOrderDbClient(null);
  });

  // ==========================================================================
  // SECTION 1: TENANT ISOLATION
  // ==========================================================================
  describe('§1 — Tenant Isolation Boundary', () => {
    test('TI-1: User from Tenant A cannot read Tenant B Work Order', async () => {
      const ctx = createContext({ tenantId: TENANT_A });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow('not found in tenant');
    });

    test('TI-2: User from Tenant A cannot read Tenant B Work Order View', async () => {
      const ctx = createContext({ tenantId: TENANT_A });
      await expect(
        findWorkOrderViewById(ctx, '00000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow('not found in tenant');
    });

    test('TI-3: User from Tenant A cannot read Tenant B Job Order', async () => {
      const ctx = createContext({ tenantId: TENANT_A });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow('not found in tenant');
    });

    test('TI-4: User from Tenant B cannot read Tenant A Work Order or Job Order', async () => {
      const ctx = createContext({ tenantId: TENANT_B });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in tenant');
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in tenant');
    });
  });

  // ==========================================================================
  // SECTION 2: DOMAIN PERMISSIONS (DECISION A)
  // ==========================================================================
  describe('§2 — Decision A: Domain-Specific Read Permissions', () => {
    test('DA-1: User with work_order:read (WITHOUT commercial:read) can read Work Order', async () => {
      const ctx = createContext({
        permissions: ['work_order:read'], // No commercial:read
      });
      const wo = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001');
      expect(wo).toBeDefined();
      expect(wo.woNumber).toBe('WO-A-TR-001');

      const woView = await findWorkOrderViewById(ctx, '00000000-0000-0000-0000-000000000001');
      expect(woView.woNumber).toBe('WO-A-TR-001');

      const items = await listWorkOrderItems(ctx, '00000000-0000-0000-0000-000000000001');
      expect(items).toHaveLength(1);

      const execView = await getWorkOrderExecutionView(ctx, '00000000-0000-0000-0000-000000000001');
      expect(execView.workOrder.woNumber).toBe('WO-A-TR-001');
    });

    test('DA-2: User WITHOUT work_order:read is rejected when reading Work Order', async () => {
      const ctx = createContext({
        permissions: ['job_order:read', 'commercial:read'], // No work_order:read
      });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
      await expect(
        findWorkOrderViewById(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
      await expect(
        listWorkOrderItems(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
      await expect(
        getWorkOrderExecutionView(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
    });

    test('DA-3: User with job_order:read (WITHOUT commercial:read) can read Job Order', async () => {
      const ctx = createContext({
        permissions: ['job_order:read'], // No commercial:read
      });
      const jo = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001');
      expect(jo).toBeDefined();
      expect(jo.joNumber).toBe('JO-A-TR-001');

      const joList = await listJobOrdersForWorkOrderItem(ctx, '10000000-0000-0000-0000-000000000001');
      expect(joList).toHaveLength(1);

      const enriched = await enrichJobOrdersWithEntityNames(ctx, [jo]);
      expect(enriched[0].joNumber).toBe('JO-A-TR-001');
    });

    test('DA-4: User WITHOUT job_order:read is rejected when reading Job Order', async () => {
      const ctx = createContext({
        permissions: ['work_order:read', 'commercial:read'], // No job_order:read
      });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
      await expect(
        listJobOrdersForWorkOrderItem(ctx, '10000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow();
      await expect(
        enrichJobOrdersWithEntityNames(ctx, []),
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 3: SBU RECORD VISIBILITY (DECISION B)
  // ==========================================================================
  describe('§3 — Decision B: SBU-Scoped Record Visibility', () => {
    test('DB-TR1: Trucking operational user can read TRUCKING Job Order within own tenant', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      const jo = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001');
      expect(jo.joNumber).toBe('JO-A-TR-001');
      expect(jo.sbuType).toBe('TRUCKING');
    });

    test('DB-TR2: Trucking operational user CANNOT read WAREHOUSE Job Order (returns 404)', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000002'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-TR3: Trucking operational user CANNOT read CUSTOMS Job Order (returns 404)', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000003'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-TR4: Trucking operational user CANNOT read FORWARDING Job Order (returns 404)', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000004'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-TR5: Trucking operational user can read Work Order with TRUCKING items', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      const wo = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001');
      expect(wo.woNumber).toBe('WO-A-TR-001');
    });

    test('DB-TR6: Trucking operational user CANNOT read Work Order with only WAREHOUSE items', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: 'trucking',
      });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000002'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-WH1: Warehouse operational user can read WAREHOUSE Job Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_WH,
        permissions: ['job_order:read', 'warehouse:read'],
        sbuScope: 'warehouse',
      });
      const jo = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000002');
      expect(jo.joNumber).toBe('JO-A-WH-002');
      expect(jo.sbuType).toBe('WAREHOUSE');
    });

    test('DB-WH2: Warehouse operational user CANNOT read TRUCKING Job Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_WH,
        permissions: ['job_order:read', 'warehouse:read'],
        sbuScope: 'warehouse',
      });
      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-CL1: Customs operational user can read CLEARANCE Work Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_MANAGER_CL,
        permissions: ['work_order:read', 'customs:read'],
        sbuScope: 'clearances',
      });
      const wo = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000003');
      expect(wo.woNumber).toBe('WO-A-CL-003');
    });

    test('DB-CL2: Customs operational user CANNOT read TRUCKING Work Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_MANAGER_CL,
        permissions: ['work_order:read', 'customs:read'],
        sbuScope: 'clearances',
      });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('DB-FWD1: Forwarding operational user can read FORWARDING Work Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_MANAGER_FWD,
        permissions: ['work_order:read', 'shipment:read'],
        sbuScope: 'forwarding',
      });
      const wo = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000004');
      expect(wo.woNumber).toBe('WO-A-FWD-004');
    });

    test('DB-FWD2: Forwarding operational user CANNOT read TRUCKING Work Order', async () => {
      const ctx = createContext({
        role: ROLE_SBU_MANAGER_FWD,
        permissions: ['work_order:read', 'shipment:read'],
        sbuScope: 'forwarding',
      });
      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');
    });
  });

  // ==========================================================================
  // SECTION 4: CROSS-SBU AUTHORITY
  // ==========================================================================
  describe('§4 — Cross-SBU Authority (HQ / Tenant Owner / Tenant Admin)', () => {
    test('X-1: Tenant Admin (sbuScope: null) retains tenant-wide visibility across all SBUs', async () => {
      const ctx = createContext({
        role: ROLE_TENANT_ADMIN,
        sbuScope: null,
      });

      const joTr = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001');
      const joWh = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000002');
      const joCl = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000003');
      const joFwd = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000004');

      expect(joTr.sbuType).toBe('TRUCKING');
      expect(joWh.sbuType).toBe('WAREHOUSE');
      expect(joCl.sbuType).toBe('CLEARANCE');
      expect(joFwd.sbuType).toBe('FORWARDING');
    });

    test('X-2: Tenant Owner (sbuScope: null) retains tenant-wide visibility', async () => {
      const ctx = createContext({
        role: ROLE_OWNER,
        isTenantOwner: true,
        sbuScope: null,
      });

      const woTr = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001');
      const woWh = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000002');

      expect(woTr.woNumber).toBe('WO-A-TR-001');
      expect(woWh.woNumber).toBe('WO-A-WH-002');
    });

    test('X-3: HQ Operations Director (sbuScope: null) retains tenant-wide visibility across all SBUs', async () => {
      const ctx = createContext({
        role: ROLE_HQ_DIRECTOR_OPS,
        permissions: ['work_order:read', 'job_order:read', 'shipment:read', 'customs:read', 'warehouse:read'],
        sbuScope: null,
      });

      const woTr = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001');
      const woFwd = await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000004');

      expect(woTr.woNumber).toBe('WO-A-TR-001');
      expect(woFwd.woNumber).toBe('WO-A-FWD-004');
    });

    test('X-4: Non-SBU role (ROLE_DRIVER) with sbuScope: null does NOT gain cross-SBU visibility (TEST C)', async () => {
      expect(hasCrossSbuAuthority(ROLE_DRIVER)).toBe(false);
      const driverCtx = createContext({
        role: ROLE_DRIVER,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: null,
      });

      // Cannot read arbitrary WO (throws 404 not found in SBU scope)
      await expect(
        findWorkOrderById(driverCtx, '00000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');

      // Cannot read arbitrary JO (throws 404 not found in SBU scope)
      await expect(
        findJobOrderById(driverCtx, '20000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');

      // Cannot list WO items (returns empty list)
      const items = await listWorkOrderItems(driverCtx, '00000000-0000-0000-0000-000000000001');
      expect(items).toEqual([]);

      // Cannot list JOs (returns empty list)
      const jos = await listJobOrdersForWorkOrderItem(driverCtx, '10000000-0000-0000-0000-000000000001');
      expect(jos).toEqual([]);
    });

    test('X-5: Non-SBU role (ROLE_GROUND_STAFF) with sbuScope: null does NOT gain cross-SBU visibility (TEST C)', async () => {
      expect(hasCrossSbuAuthority(ROLE_GROUND_STAFF)).toBe(false);
      const groundCtx = createContext({
        role: ROLE_GROUND_STAFF,
        permissions: ['work_order:read', 'job_order:read'],
        sbuScope: null,
      });

      await expect(
        findJobOrderById(groundCtx, '20000000-0000-0000-0000-000000000001'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('X-6: Cross-SBU user (ROLE_TENANT_ADMIN) with cross-SBU authority in Tenant A CANNOT read Tenant B records (TEST D)', async () => {
      const adminCtx = createContext({
        tenantId: TENANT_A,
        role: ROLE_TENANT_ADMIN,
        sbuScope: null,
      });

      // Tenant isolation takes precedence: cross-SBU authority is strictly tenant-scoped
      await expect(
        findWorkOrderById(adminCtx, '00000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow('not found in tenant');
      await expect(
        findJobOrderById(adminCtx, '20000000-0000-0000-0000-000000000099'),
      ).rejects.toThrow('not found in tenant');
    });
  });

  // ==========================================================================
  // SECTION 5: UNKNOWN / NULL SBU HANDLING (§9)
  // ==========================================================================
  describe('§5 — Null / Unknown SBU Classification Handling', () => {
    test('NU-1: SBU-scoped operational user CANNOT read record with null SBU (UNKNOWN SBU != USER SBU)', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['job_order:read'],
        sbuScope: 'trucking',
      });

      await expect(
        findJobOrderById(ctx, '20000000-0000-0000-0000-000000000005'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('NU-2: SBU-scoped operational user CANNOT read Work Order with null SBU item', async () => {
      const ctx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['work_order:read'],
        sbuScope: 'trucking',
      });

      await expect(
        findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000005'),
      ).rejects.toThrow('not found in SBU scope');
    });

    test('NU-3: Cross-SBU user (sbuScope: null) CAN read records with null/unassigned SBU', async () => {
      const ctx = createContext({
        role: ROLE_TENANT_ADMIN,
        sbuScope: null,
      });

      const jo = await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000005');
      expect(jo.joNumber).toBe('JO-A-NULL-005');
      expect(jo.sbuType).toBeNull();
    });
  });

  // ==========================================================================
  // SECTION 6: COPILOT LIVE READ INHERITANCE
  // ==========================================================================
  describe('§6 — Copilot Live Read Canonical Authorization Inheritance', () => {
    const mockDelegate: OperationalReadDelegate = {
      async findJobOrderByNumber(ctx, joNumber) {
        if (joNumber === 'JO-A-TR-001') {
          return {
            id: '20000000-0000-0000-0000-000000000001',
            joNumber: 'JO-A-TR-001',
            status: 'ACTIVE',
            sbuType: 'TRUCKING',
          };
        }
        if (joNumber === 'JO-A-WH-002') {
          return {
            id: '20000000-0000-0000-0000-000000000002',
            joNumber: 'JO-A-WH-002',
            status: 'ACTIVE',
            sbuType: 'WAREHOUSE',
          };
        }
        return null;
      },
      async listJobOrders(ctx) {
        return [
          {
            id: '20000000-0000-0000-0000-000000000001',
            joNumber: 'JO-A-TR-001',
            status: 'ACTIVE',
            sbuType: 'TRUCKING',
          },
          {
            id: '20000000-0000-0000-0000-000000000002',
            joNumber: 'JO-A-WH-002',
            status: 'ACTIVE',
            sbuType: 'WAREHOUSE',
          },
        ];
      },
      async findWorkOrderByNumber(ctx, woNumber) {
        if (woNumber === 'WO-A-TR-001') {
          return {
            id: '00000000-0000-0000-0000-000000000001',
            woNumber: 'WO-A-TR-001',
            status: 'ACTIVE',
            capability: 'TRUCKING',
          };
        }
        if (woNumber === 'WO-A-WH-002') {
          return {
            id: '00000000-0000-0000-0000-000000000002',
            woNumber: 'WO-A-WH-002',
            status: 'ACTIVE',
            capability: 'WAREHOUSE',
          };
        }
        return null;
      },
      async findSalesOrderByNumber() {
        return null;
      },
      async findShipmentByNumber(ctx, shipmentNumber) {
        return {
          id: 'shp-001',
          shipmentNumber: 'SHP-2026-0001',
          status: 'ACTIVE',
        };
      },
    };

    beforeEach(() => {
      _setOperationalReadDelegate(mockDelegate);
    });

    afterEach(() => {
      _setOperationalReadDelegate(null);
    });

    test('CP-1: Copilot requires work_order:read (not commercial:read) for WORK_ORDER', async () => {
      const authorizedCtx = createContext({
        permissions: ['work_order:read'],
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-A-TR-001' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(authorizedCtx, qContext);
      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.results[0].displayIdentifier).toBe('WO-A-TR-001');

      const unauthorizedCtx = createContext({
        permissions: ['commercial:read'], // Lacks work_order:read
      });
      await expect(
        OperationalLiveReadGateway.executeLiveRead(unauthorizedCtx, qContext),
      ).rejects.toThrow();
    });

    test('CP-2: Copilot requires job_order:read for JOB_ORDER and REPLACE_DRIVER', async () => {
      const authorizedCtx = createContext({
        permissions: ['job_order:read'],
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-A-TR-001',
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(authorizedCtx, qContext);
      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.results[0].displayIdentifier).toBe('JO-A-TR-001');

      const qContextAction: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-A-TR-001',
        requestedOperation: 'REPLACE_DRIVER',
        conversationTurn: 1,
      };
      const resAction = await OperationalLiveReadGateway.executeLiveRead(authorizedCtx, qContextAction);
      expect(resAction.resolutionState).toBe('PROPOSAL');

      const unauthorizedCtx = createContext({
        permissions: ['commercial:read'], // Lacks job_order:read
      });
      await expect(
        OperationalLiveReadGateway.executeLiveRead(unauthorizedCtx, qContext),
      ).rejects.toThrow();
    });

    test('CP-3: Copilot enforces SBU scope — Trucking user cannot read Warehouse JO', async () => {
      const trCtx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['job_order:read'],
        sbuScope: 'trucking',
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-A-WH-002',
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(trCtx, qContext);
      expect(res.resolutionState).toBe('NOT_FOUND');
    });

    test('CP-4: Copilot enforces SBU scope — Trucking user cannot read Shipment (returns NOT_FOUND)', async () => {
      const trCtx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['shipment:read', 'job_order:read'],
        sbuScope: 'trucking', // Non-forwarding SBU
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        shipmentNumber: 'SHP-2026-0001',
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(trCtx, qContext);
      expect(res.resolutionState).toBe('NOT_FOUND');
    });

    test('CP-5: Copilot filters list queries by user SBU scope', async () => {
      const trCtx = createContext({
        role: ROLE_SBU_OPS_TR,
        permissions: ['job_order:read'],
        sbuScope: 'trucking',
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(trCtx, qContext);
      expect(res.counts.total).toBe(1);
      expect(res.results[0].displayIdentifier).toBe('JO-A-TR-001');
    });

    test('CP-6: Copilot allows cross-SBU user tenant-wide visibility', async () => {
      const adminCtx = createContext({
        role: ROLE_TENANT_ADMIN,
        permissions: ['job_order:read'],
        sbuScope: null,
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(adminCtx, qContext);
      expect(res.counts.total).toBe(2);
    });

    test('CP-7: Copilot blocks Non-SBU role (ROLE_DRIVER) with sbuScope: null from cross-SBU reads', async () => {
      const driverCtx = createContext({
        role: ROLE_DRIVER,
        permissions: ['job_order:read', 'work_order:read', 'shipment:read'],
        sbuScope: null,
      });

      // 1. Single JO query -> NOT_FOUND
      const qContextJo: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-A-TR-001',
        conversationTurn: 1,
      };
      const resJo = await OperationalLiveReadGateway.executeLiveRead(driverCtx, qContextJo);
      expect(resJo.resolutionState).toBe('NOT_FOUND');

      // 2. Filtered list JO query -> 0 records
      const qContextList: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        activeFilters: {},
        conversationTurn: 1,
      };
      const resList = await OperationalLiveReadGateway.executeLiveRead(driverCtx, qContextList);
      expect(resList.counts.total).toBe(0);
      expect(resList.results).toHaveLength(0);

      // 3. Single WO query -> NOT_FOUND
      const qContextWo: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-A-TR-001' },
        conversationTurn: 1,
      };
      const resWo = await OperationalLiveReadGateway.executeLiveRead(driverCtx, qContextWo);
      expect(resWo.resolutionState).toBe('NOT_FOUND');

      // 4. Shipment query -> NOT_FOUND
      const qContextShp: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        shipmentNumber: 'SHP-2026-0001',
        conversationTurn: 1,
      };
      const resShp = await OperationalLiveReadGateway.executeLiveRead(driverCtx, qContextShp);
      expect(resShp.resolutionState).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // SECTION 7: MUTATION SAFETY & EXECUTION BOUNDARY
  // ==========================================================================
  describe('§7 — Mutation Safety & Execution Guard', () => {
    test('MS-1: All read operations execute zero insert, update, or delete commands', async () => {
      const ctx = createContext();
      // Executing queries across all methods
      await findWorkOrderById(ctx, '00000000-0000-0000-0000-000000000001');
      await findWorkOrderViewById(ctx, '00000000-0000-0000-0000-000000000001');
      await listWorkOrderItems(ctx, '00000000-0000-0000-0000-000000000001');
      await findJobOrderById(ctx, '20000000-0000-0000-0000-000000000001');
      await listJobOrdersForWorkOrderItem(ctx, '10000000-0000-0000-0000-000000000001');
      await getWorkOrderExecutionView(ctx, '00000000-0000-0000-0000-000000000001');

      // The mock throws on any insert/update/delete call — test passing proves zero mutations occurred.
      expect(true).toBe(true);
    });
  });
});
