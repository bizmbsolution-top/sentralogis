/**
 * Sentralogis — Phase 4B-2 / U-04
 * Test Suite: Commercial Work Order Application API (core scenarios)
 *
 * Scenarios (mandate §30, service level — routes are thin):
 *  T1   Valid create → application view, created=true
 *  T2   Protected field (tenant_id) in body → rejected 400
 *  T3   Persisted tenant_id === IdentityContext.tenantId
 *  T4   Role without commercial:manage → 403
 *  T5   Unauthenticated identity → 401
 *  T6   Existing open engagement reused → created=false, ZERO inserts
 *  T7   New work order → exactly ONE commercial_work_orders insert
 *  T8   Customer/engagement mismatch → 409
 *  T9   Cross-tenant engagement reference → 404 non-leaking
 *  T10  List returns only caller tenant rows
 *  T11  Cross-tenant list isolation (Tenant B sees only B)
 *  T12  Read authorization missing → 403 on list
 *  T13-T17  No JO / wo_items / legacy WO / service_requests / bindings writes
 *  T18  Duplicate/retry POST → same id, created=false
 *  T19  Concurrent creation → ONE row
 */

import type { IdentityContext } from '../../identity/types';
import { resolveIdentityContext } from '../../identity/resolver';
import { IdentityResolutionError } from '../../identity/errors';
import {
  createWorkOrder,
  listWorkOrders,
  parseListFilters,
  _setWorkOrderRepository,
} from '../index';
import { WorkOrderError } from '../types';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import { CwoMockDb, TENANT_A, TENANT_B, CUST_A1, CUST_A2, FORBIDDEN_TABLES } from './mock-db';

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: 'u0000000-0000-4000-8000-00000000000a',
    tenantId: TENANT_A,
    membershipId: 'mem-1',
    role: 'HQ_COMMERCIAL_DIRECTOR',
    isTenantOwner: false,
    permissions: ['commercial:read', 'commercial:manage'],
    sbuScope: null,
    ...over,
  };
}

export async function runCommercialWorkOrderSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  const mock = new CwoMockDb();

  async function withMock<T>(fn: () => Promise<T>): Promise<T> {
    mock.reset();
    _setEngagementDbClient(mock.asEngagementClient());
    _setWorkOrderRepository(mock.asRepository());
    try {
      return await fn();
    } finally {
      _setEngagementDbClient(null);
      _setWorkOrderRepository(null);
    }
  }

  /* ---- T1: Valid POST creates a commercial work order ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    const result = await createWorkOrder(makeCtx(), { customerId: CUST_A1, contractReference: 'REF-001' });
    assert(
      result.created === true &&
        result.workOrder.status === 'DRAFT' &&
        result.workOrder.currency === 'IDR' &&
        result.workOrder.contractReference === 'REF-001' &&
        typeof result.workOrder.id === 'string' &&
        /^TENA-CUSA-\d{4}-\d{3}$/.test(result.workOrder.woNumber),
      'T1 valid POST returns application view with created=true',
      JSON.stringify(result.workOrder),
    );
  });

  /* ---- T2: Protected field injection rejected ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    let code = '';
    let status = 0;
    try {
      await createWorkOrder(makeCtx(), { customerId: CUST_A1, tenant_id: TENANT_B });
    } catch (err) {
      if (err instanceof WorkOrderError) { code = err.code; status = err.statusCode; }
    }
    assert(code === 'VALIDATION_FAILED' && status === 400, 'T2 client-supplied tenant_id rejected with 400', `${code}/${status}`);
  });

  /* ---- T3: Persisted tenant comes from IdentityContext ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    const result = await createWorkOrder(makeCtx(), { customerId: CUST_A2 });
    const ins = mock.inserts.find(i => i.table === 'commercial_work_orders');
    assert(
      !!result.workOrder.id && !!ins && ins.row.tenant_id === TENANT_A && ins.row.customer_id === CUST_A2,
      'T3 persisted tenant equals IdentityContext.tenantId',
    );
  });

  /* ---- T4: Unauthorized role → 403 ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    let thrown = false;
    try {
      await createWorkOrder(makeCtx({ permissions: ['commercial:read'] }), { customerId: CUST_A1 });
    } catch (err) {
      thrown = err instanceof IdentityResolutionError && err.statusCode === 403;
    }
    assert(thrown, 'T4 missing commercial:manage rejected with 403');
  });

  /* ---- T5: Unauthenticated → 401 (identity gate upstream) ---- */
  await withMock(async () => {
    let thrown = false;
    let status = 0;
    try {
      resolveIdentityContext({ userId: null, source: { getStaffMemberships: () => [], getOwnedTenants: () => [] } });
    } catch (err) {
      if (err instanceof IdentityResolutionError) { thrown = true; status = err.statusCode; }
    }
    assert(thrown && status === 401, 'T5 unauthenticated rejected with 401');
  });

  /* ---- T6: Existing open engagement reused (U-03 resolver reuse) ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    const seeded = mock.seedWorkOrder();
    const result = await createWorkOrder(makeCtx(), { customerId: CUST_A1 });
    assert(
      result.created === false &&
        result.workOrder.id === seeded.id &&
        mock.countWrites('commercial_work_orders') === 0,
      'T6 existing open work order resolved without any insert',
    );
  });

  /* ---- T7: New work order — exactly one canonical insert ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    const result = await createWorkOrder(makeCtx(), { customerId: CUST_A2 });
    assert(
      result.created === true && mock.countWrites('commercial_work_orders') === 1,
      'T7 new work order produces exactly ONE canonical insert',
    );
  });

  /* ---- T8: Customer/engagement mismatch → 409 ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    const seeded = mock.seedWorkOrder();
    let code = '';
    let status = 0;
    try {
      await createWorkOrder(makeCtx(), { customerId: CUST_A2, engagementId: String(seeded.id) });
    } catch (err) {
      if (err instanceof WorkOrderError) { code = err.code; status = err.statusCode; }
    }
    assert(
      code === 'ENGAGEMENT_CUSTOMER_MISMATCH' && status === 409,
      'T8 customer/engagement mismatch rejected with 409',
      `${code}/${status}`,
    );
  });

  /* ---- T9: Cross-tenant engagement reference → non-leaking 404 ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    const foreign = mock.seedWorkOrder({ id: 'd0000000-0000-4000-8000-00000000000b', tenant_id: TENANT_B });
    let code = '';
    let status = 0;
    try {
      await createWorkOrder(makeCtx(), { customerId: CUST_A1, engagementId: String(foreign.id) });
    } catch (err) {
      if (err instanceof WorkOrderError) { code = err.code; status = err.statusCode; }
    }
    assert(code === 'NOT_FOUND' && status === 404, 'T9 cross-tenant reference does not leak (404)', `${code}/${status}`);
  });

  /* ---- T10/T11: List isolation ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    mock.seedWorkOrder({ id: 'd1000000-0000-4000-8000-00000000000a' });
    mock.seedWorkOrder({ id: 'd1000000-0000-4000-8000-00000000000b', customer_id: CUST_A2 });
    mock.seedWorkOrder({ id: 'd2000000-0000-4000-8000-00000000000a', tenant_id: TENANT_B });

    const resA = await listWorkOrders(makeCtx(), parseListFilters(new URLSearchParams('limit=50')));
    const ctxB = makeCtx({ tenantId: TENANT_B, role: 'TENANT_OWNER', isTenantOwner: true });
    const resB = await listWorkOrders(ctxB, parseListFilters(new URLSearchParams()));

    assert(
      resA.meta.total === 2 && resA.data.every(d => d.id.startsWith('d1')),
      'T10 list returns ONLY caller tenant rows',
      `total=${resA.meta.total}`,
    );
    assert(
      resB.meta.total === 1 && resB.data[0].id === 'd2000000-0000-4000-8000-00000000000a',
      'T11 Tenant B cannot see Tenant A rows',
    );
  });

  /* ---- T12: Read authorization missing → 403 ---- */
  await withMock(async () => {
    let thrown = false;
    try {
      await listWorkOrders(makeCtx({ permissions: [] }), parseListFilters(new URLSearchParams()));
    } catch (err) {
      thrown = err instanceof IdentityResolutionError && err.statusCode === 403;
    }
    assert(thrown, 'T12 missing commercial:read rejected with 403 on GET list');
  });

  /* ---- T13-T17: No forbidden table receives ANY write ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    await createWorkOrder(makeCtx(), { customerId: CUST_A2 });
    await createWorkOrder(makeCtx(), { customerId: CUST_A2 });
    const violations = FORBIDDEN_TABLES.filter(t => mock.countWrites(t) > 0);
    assert(
      violations.length === 0 && mock.countWrites('legacy_wo_bridge') === 0,
      'T13-T17 zero writes to JO/wo_items/legacy WO/SR/bindings tables',
      violations.join(','),
    );
  });

  /* ---- T18: Duplicate/retry POST → same id, created=false ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    const r1 = await createWorkOrder(makeCtx(), { customerId: CUST_A1 });
    const r2 = await createWorkOrder(makeCtx(), { customerId: CUST_A1 });
    assert(
      r1.created === true && r2.created === false && r1.workOrder.id === r2.workOrder.id,
      'T18 duplicate POST resolves the same work order',
    );
  });

  /* ---- T19: Concurrent creation → ONE row ---- */
  await withMock(async () => {
    mock.seedCustomer(CUST_A2, TENANT_A, 'CUSB');
    mock.selectNullBudget = 2;
    const [ra, rb] = await Promise.all([
      createWorkOrder(makeCtx(), { customerId: CUST_A2 }),
      createWorkOrder(makeCtx(), { customerId: CUST_A2 }),
    ]);
    const createdCount = [ra.created, rb.created].filter(Boolean).length;
    const openRows = mock.rows.commercial_work_orders.filter(r => r.tenant_id === TENANT_A);
    assert(
      createdCount === 1 && ra.workOrder.id === rb.workOrder.id && openRows.length === 1,
      'T19 concurrent race produces exactly ONE canonical row',
      `created=${createdCount} rows=${openRows.length}`,
    );
  });

  console.log('----------------------------------------------------');
  console.log(`U-04 COMMERCIAL WORK ORDER SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
