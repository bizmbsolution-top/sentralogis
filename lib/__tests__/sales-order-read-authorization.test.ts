/**
 * Sentralogis — Targeted Test Suite: Sales Order Read Authorization
 * lib/__tests__/sales-order-read-authorization.test.ts
 *
 * Verifies the resolution of the `commercial:read` vs `sales_order:read`
 * permission mismatch for Sales Order detail and read views.
 *
 * Covered Gates:
 * 1. User with `sales_order:read` can read SO detail via findSalesOrderById.
 * 2. User with `sales_order:read` can list SOs via listSalesOrdersForEngagement and listSalesOrdersForTenant.
 * 3. User with `sales_order:read` can read SO line items via listSOLineItemsBySO and getSOLineItemById.
 * 4. User with `sales_order:read` can read fulfillments via listFulfillmentsBySalesOrder, findFulfillmentById, and findFulfillmentCompositionById.
 * 5. User with `sales_order:read` can read operational handoffs via listOperationalHandoffsByFulfillment and findOperationalHandoffById.
 * 6. User with `sales_order:read` can read operational lineage via getOperationalLineageForOrder.
 * 7. User with `commercial:read` continues to be allowed on all these endpoints.
 * 8. User with role `hq_cs` (which holds `sales_order:read` but not `commercial:read`) can read all views.
 * 9. User without appropriate permissions (e.g. driver with only job_order:read) is rejected with 403.
 * 10. Cross-tenant reads are strictly rejected (tenant isolation maintained).
 * 11. Copilot Live Read succeeds for users with `sales_order:read`.
 * 12. Mutation operations (updateDraftSalesOrder, confirmSalesOrder, cancelSalesOrder) reject read-only callers without manage permissions.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import {
  findSalesOrderById,
  listSalesOrdersForEngagement,
  listSalesOrdersForTenant,
  updateDraftSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  _setSalesOrderDbClient,
} from '@/lib/sales-order/service';
import type { SalesOrderDbClient } from '@/lib/sales-order/service';
import {
  listSOLineItemsBySO,
  getSOLineItemById,
  _setSalesOrderLineDbClient,
} from '@/lib/sales-order/line-repository';
import type { SalesOrderLineDbClient } from '@/lib/sales-order/line-repository';
import {
  listFulfillmentsBySalesOrder,
  findFulfillmentById,
  findFulfillmentCompositionById,
  _setFulfillmentDbClient,
} from '@/lib/fulfillment/service';
import type { FulfillmentDbClient } from '@/lib/fulfillment/service';
import {
  listOperationalHandoffsByFulfillment,
  findOperationalHandoffById,
  _setOperationalHandoffDbClient,
} from '@/lib/operational-handoff/service';
import type { OperationalHandoffDbClient } from '@/lib/operational-handoff/service';
import { getOperationalLineageForOrder } from '@/lib/work-order/service';
import { OperationalLiveReadGateway } from '@/lib/copilot/read/operational-live-read-gateway';
import { getEntityDetail } from '@/lib/copilot/read/read-gateway-service';
import { ROLE_HQ_CS } from '@/lib/application/identity/roles';

type Row = Record<string, unknown>;

export async function runSalesOrderReadAuthorizationSuite() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${msg}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${msg}`);
    }
  }

  const TENANT_A = '78846049-fb63-45a9-93da-3af3fea5b587';
  const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';

  const SO_DRAFT_A1: Row = {
    id: '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
    tenant_id: TENANT_A,
    engagement_id: 'eng-001',
    so_number: 'SO-2026-10-0009',
    status: 'DRAFT',
    order_date: '2026-10-17T00:00:00Z',
    target_fulfillment_date: '2026-10-20T00:00:00Z',
    currency: 'IDR',
    total_agreed_revenue: 15000000,
    payment_terms_days: 30,
    incoterm: 'FRC',
    commercial_notes: 'Delivery to Cikarang',
    version_no: 1,
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
  };

  const SO_CONFIRMED_A1: Row = {
    id: 'so-confirmed-001',
    tenant_id: TENANT_A,
    engagement_id: 'eng-001',
    so_number: 'SO-2026-10-0010',
    status: 'CONFIRMED',
    order_date: '2026-10-17T00:00:00Z',
    target_fulfillment_date: '2026-10-20T00:00:00Z',
    currency: 'IDR',
    total_agreed_revenue: 15000000,
    payment_terms_days: 30,
    incoterm: 'FRC',
    commercial_notes: 'Confirmed for fulfillment',
    version_no: 2,
    created_at: '2026-10-17T00:00:00Z',
    updated_at: '2026-10-17T00:00:00Z',
  };

  const ENG_A1: Row = {
    id: 'eng-001',
    tenant_id: TENANT_A,
    customer_id: 'cust-tps-001',
    wo_number: 'ENG-2026-10-0001',
    status: 'OPEN',
  };

  const SO_LINE_A1: Row = {
    id: 'line-001',
    tenant_id: TENANT_A,
    sales_order_id: SO_DRAFT_A1.id,
    line_sequence: 1,
    capability_type: 'TRUCKING',
    side: 'SELL',
    service_description: 'Trucking NPCT1 to Cikarang',
    quantity: 2,
    unit_of_measure: 'Container',
    currency: 'IDR',
    unit_rate: 7500000,
    line_total: 15000000,
    status: 'DRAFT',
    created_at: '2026-10-17T00:00:00Z',
  };

  const FL_A1: Row = {
    id: 'fl-001',
    tenant_id: TENANT_A,
    sales_order_id: SO_CONFIRMED_A1.id,
    fulfillment_number: 'FL-2026-10-0001',
    revision_no: 1,
    version_no: 1,
    status: 'DRAFT',
    created_at: '2026-10-17T00:00:00Z',
  };

  const FL_ALLOC_A1: Row = {
    id: 'alloc-001',
    tenant_id: TENANT_A,
    fulfillment_id: 'fl-001',
    capability_type: 'TRUCKING',
    status: 'PENDING',
    created_at: '2026-10-17T00:00:00Z',
  };

  const HANDOFF_A1: Row = {
    id: 'handoff-001',
    tenant_id: TENANT_A,
    fulfillment_id: 'fl-001',
    fulfillment_allocation_id: 'alloc-001',
    handoff_number: 'HO-2026-10-0001',
    target_domain: 'TRUCKING',
    status: 'ISSUED',
    created_at: '2026-10-17T00:00:00Z',
  };

  // Mock Database Client
  const mockDb: any = {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const inFilters: Record<string, unknown[]> = {};
      return {
        select: (_cols?: string) => {
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters[col] = val;
              return chain;
            },
            in: (col: string, vals: unknown[]) => {
              inFilters[col] = vals;
              return chain;
            },
            order: (_col: string, _opts?: any) => chain,
            limit: (_n: number) => chain,
            single: async () => {
              const res = await chain.maybeSingle();
              if (!res.data) return { data: null, error: { message: 'Not found', code: 'PGRST116' } };
              return res;
            },
            maybeSingle: async () => {
              let rows: Row[] = [];
              if (table === 'sales_orders') rows = [SO_DRAFT_A1, SO_CONFIRMED_A1];
              else if (table === 'commercial_work_orders') rows = [ENG_A1];
              else if (table === 'sales_order_line_items') rows = [SO_LINE_A1];
              else if (table === 'fulfillments') rows = [FL_A1];
              else if (table === 'fulfillment_allocations') rows = [FL_ALLOC_A1];
              else if (table === 'operational_handoffs') rows = [HANDOFF_A1];
              else if (table === 'work_orders') rows = [];

              const match = rows.find((r) => {
                for (const [k, v] of Object.entries(filters)) {
                  if (r[k] !== v) return false;
                }
                return true;
              });
              return { data: match || null, error: null };
            },
            then: (resolve: any) => {
              let rows: Row[] = [];
              if (table === 'sales_orders') rows = [SO_DRAFT_A1, SO_CONFIRMED_A1];
              else if (table === 'commercial_work_orders') rows = [ENG_A1];
              else if (table === 'sales_order_line_items') rows = [SO_LINE_A1];
              else if (table === 'fulfillments') rows = [FL_A1];
              else if (table === 'fulfillment_allocations') rows = [FL_ALLOC_A1];
              else if (table === 'operational_handoffs') rows = [HANDOFF_A1];
              else if (table === 'work_orders') rows = [];
              else if (table === 'wo_items') rows = [];

              const matched = rows.filter((r) => {
                for (const [k, v] of Object.entries(filters)) {
                  if (r[k] !== v) return false;
                }
                for (const [k, v] of Object.entries(inFilters)) {
                  if (!v.includes(r[k])) return false;
                }
                return true;
              });
              resolve({ data: matched, error: null });
            },
          };
          return chain;
        },
        update: (_payload: Row) => ({
          eq: () => ({
            eq: () => ({
              select: async () => ({ data: [SO_DRAFT_A1], error: null }),
            }),
          }),
        }),
      };
    },
  };

  // Wire up database mocks
  _setSalesOrderDbClient(mockDb as SalesOrderDbClient);
  _setSalesOrderLineDbClient(mockDb as SalesOrderLineDbClient);
  _setFulfillmentDbClient(mockDb as FulfillmentDbClient);
  _setOperationalHandoffDbClient(mockDb as OperationalHandoffDbClient);

  // Identity contexts
  const salesOrderReadCtx: IdentityContext = {
    userId: 'u-so-read',
    tenantId: TENANT_A,
    membershipId: 'mem-so-read',
    isTenantOwner: false,
    sbuScope: null,
    role: 'sales_assistant',
    permissions: ['sales_order:read'],
  };

  const commercialReadCtx: IdentityContext = {
    userId: 'u-comm-read',
    tenantId: TENANT_A,
    membershipId: 'mem-comm-read',
    isTenantOwner: false,
    sbuScope: null,
    role: 'finance_viewer',
    permissions: ['commercial:read'],
  };

  const hqCsCtx: IdentityContext = {
    userId: 'u-hq-cs',
    tenantId: TENANT_A,
    membershipId: 'mem-hq-cs',
    isTenantOwner: false,
    sbuScope: null,
    role: ROLE_HQ_CS,
    permissions: ['sales_order:create', 'sales_order:read', 'work_order:read', 'work_order:update', 'job_order:read', 'customer_visibility:read', 'copilot:read'],
  };

  const noPermissionCtx: IdentityContext = {
    userId: 'u-driver',
    tenantId: TENANT_A,
    membershipId: 'mem-driver',
    isTenantOwner: false,
    sbuScope: null,
    role: 'driver',
    permissions: ['job_order:read', 'job_order:update'],
  };

  const foreignTenantCtx: IdentityContext = {
    userId: 'u-foreign',
    tenantId: TENANT_B,
    membershipId: 'mem-foreign',
    isTenantOwner: false,
    sbuScope: null,
    role: 'tenant_admin',
    permissions: ['sales_order:read', 'commercial:read'],
  };

  console.log('Running Sales Order Read Authorization Suite...');

  // Gate 1: sales_order:read reads SO detail
  try {
    const so = await findSalesOrderById(salesOrderReadCtx, SO_DRAFT_A1.id as string);
    assert(so.id === SO_DRAFT_A1.id && so.soNumber === 'SO-2026-10-0009', 'Gate 1: User with sales_order:read reads SO detail via findSalesOrderById');
  } catch (e: any) {
    assert(false, `Gate 1 failed: ${e.message}`);
  }

  // Gate 2: sales_order:read lists SOs for engagement & tenant
  try {
    const listEng = await listSalesOrdersForEngagement(salesOrderReadCtx, 'eng-001');
    const listTenant = await listSalesOrdersForTenant(salesOrderReadCtx, { limit: 10 });
    assert(listEng.length > 0 && listTenant.length > 0, 'Gate 2: User with sales_order:read lists SOs for engagement and tenant');
  } catch (e: any) {
    assert(false, `Gate 2 failed: ${e.message}`);
  }

  // Gate 3: sales_order:read reads SO line items
  try {
    const lines = await listSOLineItemsBySO(salesOrderReadCtx, SO_DRAFT_A1.id as string);
    const singleLine = await getSOLineItemById(salesOrderReadCtx, 'line-001');
    assert(lines.length > 0 && singleLine !== null, 'Gate 3: User with sales_order:read reads SO line items');
  } catch (e: any) {
    assert(false, `Gate 3 failed: ${e.message}`);
  }

  // Gate 4: sales_order:read reads fulfillments
  try {
    const fls = await listFulfillmentsBySalesOrder(salesOrderReadCtx, SO_CONFIRMED_A1.id as string);
    const flById = await findFulfillmentById(salesOrderReadCtx, 'fl-001');
    const flComp = await findFulfillmentCompositionById(salesOrderReadCtx, 'fl-001');
    assert(fls.length > 0 && flById.id === 'fl-001' && flComp.allocations.length > 0, 'Gate 4: User with sales_order:read reads fulfillments and composition');
  } catch (e: any) {
    assert(false, `Gate 4 failed: ${e.message}`);
  }

  // Gate 5: sales_order:read reads operational handoffs
  try {
    const handoffs = await listOperationalHandoffsByFulfillment(salesOrderReadCtx, 'fl-001');
    const handoffById = await findOperationalHandoffById(salesOrderReadCtx, 'handoff-001');
    assert(handoffs.length > 0 && handoffById.id === 'handoff-001', 'Gate 5: User with sales_order:read reads operational handoffs');
  } catch (e: any) {
    assert(false, `Gate 5 failed: ${e.message}`);
  }

  // Gate 6: sales_order:read reads operational lineage
  try {
    const lineage = await getOperationalLineageForOrder(salesOrderReadCtx, {
      orderId: SO_DRAFT_A1.id as string,
      orderNumber: SO_DRAFT_A1.so_number as string,
      customerId: 'cust-tps-001',
    });
    assert(Array.isArray(lineage.workOrders), 'Gate 6: User with sales_order:read reads operational lineage');
  } catch (e: any) {
    assert(false, `Gate 6 failed: ${e.message}`);
  }

  // Gate 7: commercial:read continues to succeed on all endpoints
  try {
    const so = await findSalesOrderById(commercialReadCtx, SO_DRAFT_A1.id as string);
    const fls = await listFulfillmentsBySalesOrder(commercialReadCtx, SO_CONFIRMED_A1.id as string);
    assert(so.id === SO_DRAFT_A1.id && fls.length > 0, 'Gate 7: User with commercial:read continues to read all endpoints');
  } catch (e: any) {
    assert(false, `Gate 7 failed: ${e.message}`);
  }

  // Gate 8: ROLE_HQ_CS reads all views without commercial:read error
  try {
    const so = await findSalesOrderById(hqCsCtx, SO_DRAFT_A1.id as string);
    const lines = await listSOLineItemsBySO(hqCsCtx, SO_DRAFT_A1.id as string);
    const fls = await listFulfillmentsBySalesOrder(hqCsCtx, SO_CONFIRMED_A1.id as string);
    const lineage = await getOperationalLineageForOrder(hqCsCtx, {
      orderId: SO_DRAFT_A1.id as string,
      orderNumber: SO_DRAFT_A1.so_number as string,
      customerId: 'cust-tps-001',
    });
    assert(
      so.id === SO_DRAFT_A1.id && lines.length > 0 && fls.length > 0 && Array.isArray(lineage.workOrders),
      'Gate 8: User with ROLE_HQ_CS reads SO detail, lines, fulfillments, and lineage without commercial:read error',
    );
  } catch (e: any) {
    assert(false, `Gate 8 failed: ${e.message}`);
  }

  // Gate 9: User without commercial:read and without sales_order:read is rejected with 403
  let rejectedGate9 = false;
  try {
    await findSalesOrderById(noPermissionCtx, SO_DRAFT_A1.id as string);
  } catch (e: any) {
    if (e.message?.includes('commercial:read') || e.code === 'FORBIDDEN_PERMISSION' || e.statusCode === 403) {
      rejectedGate9 = true;
    }
  }
  assert(rejectedGate9, 'Gate 9: User without commercial:read and without sales_order:read is rejected with 403');

  // Gate 10: Cross-tenant access is rejected
  let rejectedGate10 = false;
  try {
    await findSalesOrderById(foreignTenantCtx, SO_DRAFT_A1.id as string);
  } catch (e: any) {
    if (e.message?.includes('not found') || e.statusCode === 404) {
      rejectedGate10 = true;
    }
  }
  assert(rejectedGate10, 'Gate 10: Cross-tenant read is rejected with 404');

  // Gate 11: Copilot Live Read succeeds with sales_order:read
  try {
    const liveReadResult = await OperationalLiveReadGateway.executeLiveRead(hqCsCtx, {
      objectType: 'SALES_ORDER',
      salesOrderNumber: 'SO-2026-10-0009',
      activeFilters: {},
      conversationTurn: 1,
    });
    assert(
      liveReadResult.results.length > 0 && liveReadResult.results[0].displayIdentifier === 'SO-2026-10-0009',
      'Gate 11: Copilot Live Read finds SO-2026-10-0009 with sales_order:read',
    );
  } catch (e: any) {
    assert(false, `Gate 11 failed: ${e.message}`);
  }

  // Gate 12: Mutation operations reject read-only callers without manage permissions
  let rejectedMutations = 0;
  try {
    await updateDraftSalesOrder(SO_DRAFT_A1.id as string, { commercialNotes: 'Hacked' }, salesOrderReadCtx);
  } catch (e: any) {
    if (e.message?.includes('commercial:manage') || e.code === 'FORBIDDEN_PERMISSION' || e.statusCode === 403) {
      rejectedMutations++;
    }
  }
  try {
    await confirmSalesOrder(SO_DRAFT_A1.id as string, salesOrderReadCtx);
  } catch (e: any) {
    if (e.message?.includes('commercial:manage') || e.code === 'FORBIDDEN_PERMISSION' || e.statusCode === 403) {
      rejectedMutations++;
    }
  }
  try {
    await cancelSalesOrder(SO_DRAFT_A1.id as string, salesOrderReadCtx);
  } catch (e: any) {
    if (e.message?.includes('commercial:manage') || e.code === 'FORBIDDEN_PERMISSION' || e.statusCode === 403) {
      rejectedMutations++;
    }
  }
  assert(
    rejectedMutations === 3,
    'Gate 12: Mutations (updateDraft, confirm, cancel) strictly require commercial:manage and reject read-only sales_order:read callers',
  );

  // Gate 13: Copilot Unified Read Gateway getEntityDetail('sales-order') succeeds with sales_order:read (ROLE_HQ_CS)
  try {
    const soDetail = await getEntityDetail(hqCsCtx, 'sales-order', SO_DRAFT_A1.id as string);
    assert(
      soDetail.type === 'sales-order' && soDetail.title === 'SO-2026-10-0009',
      'Gate 13: Copilot Unified Read Gateway reads SO-2026-10-0009 detail with sales_order:read without commercial:read error',
    );
  } catch (e: any) {
    assert(false, `Gate 13 failed: ${e.message}`);
  }

  // Gate 14: Copilot Unified Read Gateway getEntityDetail('fulfillment') succeeds with sales_order:read (ROLE_HQ_CS)
  try {
    const flDetail = await getEntityDetail(hqCsCtx, 'fulfillment', FL_A1.id as string);
    assert(
      flDetail.type === 'fulfillment' && flDetail.title === 'FL-2026-10-0001',
      'Gate 14: Copilot Unified Read Gateway reads FL-2026-10-0001 detail with sales_order:read',
    );
  } catch (e: any) {
    assert(false, `Gate 14 failed: ${e.message}`);
  }

  // Gate 15: Copilot Unified Read Gateway strictly rejects unauthorized callers lacking commercial:read and sales_order:read
  let rejectedGate15 = false;
  try {
    await getEntityDetail(noPermissionCtx, 'sales-order', SO_DRAFT_A1.id as string);
  } catch (e: any) {
    if (e.message?.includes('commercial:read') || e.code === 'FORBIDDEN_PERMISSION' || e.statusCode === 403) {
      rejectedGate15 = true;
    }
  }
  assert(
    rejectedGate15,
    'Gate 15: Copilot Unified Read Gateway rejects sales-order read when caller lacks both commercial:read and sales_order:read',
  );

  // Teardown
  _setSalesOrderDbClient(null);
  _setSalesOrderLineDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`\nSALES ORDER READ AUTHORIZATION SUITE: ${passed}/${passed + failed} PASS, ${failed} FAIL\n`);
  return { passed, failed, total: passed + failed };
}

if (process.argv[1]?.includes('sales-order-read-authorization')) {
  runSalesOrderReadAuthorizationSuite()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
