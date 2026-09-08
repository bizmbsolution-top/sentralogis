/**
 * Sentralogis — Phase 4B-2 / U-04
 * Test Suite: Commercial Work Order validation, reference conflicts, GET single.
 *
 *  V1   Protected fields rejected (tenant_id / created_by / status)
 *  V2   Malformed UUIDs rejected
 *  V3   Bad currency / date / oversized reference rejected
 *  T20a Supplied-reference vs resolved conflict → 409
 *  G1   getWorkOrder tenant-scoped fetch works
 *  G2   getWorkOrder cross-tenant id → non-leaking 404
 *  G3   getWorkOrder invalid UUID → 400
 */

import type { IdentityContext } from '../../identity/types';
import {
  createWorkOrder,
  getWorkOrder,
  parseCreateCommand,
  parseListFilters,
  _setWorkOrderRepository,
} from '../index';
import { WorkOrderError } from '../types';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import { CwoMockDb, TENANT_A, TENANT_B, CUST_A1 } from './mock-db';

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

export async function runWorkOrderValidationSuite(): Promise<{
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

  function expectValidation(fn: () => unknown, testName: string) {
    try {
      fn();
      assert(false, testName, 'no error thrown');
    } catch (err) {
      assert(
        err instanceof WorkOrderError && err.code === 'VALIDATION_FAILED' && err.statusCode === 400,
        testName,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const mock = new CwoMockDb();

  /* ---- V1: protected fields ---- */
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, tenant_id: TENANT_B }), 'V1a tenant_id rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, created_by: 'x' }), 'V1b created_by rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, status: 'BILLED' }), 'V1c status rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, wo_number: 'X' }), 'V1d wo_number rejected');

  /* ---- V2: malformed identifiers ---- */
  expectValidation(() => parseCreateCommand({}), 'V2a missing customerId rejected');
  expectValidation(() => parseCreateCommand({ customerId: 'not-a-uuid' }), 'V2b bad customerId rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, engagementId: 'xyz' }), 'V2c bad engagementId rejected');

  /* ---- V3: field-level constraints ---- */
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, currency: 'usd' }), 'V3a lowercase currency rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, targetFulfillmentDate: '08/26/2026' }), 'V3b non-ISO date rejected');
  expectValidation(() => parseCreateCommand({ customerId: CUST_A1, contractReference: 'x'.repeat(129) }), 'V3c oversized reference rejected');
  expectValidation(() => parseListFilters(new URLSearchParams('status=WEIRD')), 'V3d unknown status filter rejected');
  expectValidation(() => parseListFilters(new URLSearchParams('limit=1000')), 'V3e oversized limit rejected');
  expectValidation(() => parseListFilters(new URLSearchParams('offset=-1')), 'V3f negative offset rejected');

  // Happy-path parse sanity.
  const ok = parseCreateCommand({ customerId: CUST_A1, currency: 'USD', targetFulfillmentDate: '2026-09-30' });
  assert(ok.currency === 'USD' && ok.targetFulfillmentDate === '2026-09-30', 'V4 valid command parses');

  /* ---- T20a: supplied reference vs resolved conflict → 409 ---- */
  mock.reset();
  _setEngagementDbClient(mock.asEngagementClient());
  _setWorkOrderRepository(mock.asRepository());
  try {
    mock.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    // Same customer holds TWO rows: an OPEN one (what U-03 resolves) and a
    // CLOSED one (what the caller supplies) → post-resolution conflict.
    mock.seedWorkOrder(); // open DRAFT
    const closed = mock.seedWorkOrder({ id: 'd3000000-0000-4000-8000-00000000000a', status: 'CLOSED' });
    let code = '';
    let status = 0;
    try {
      await createWorkOrder(makeCtx(), { customerId: CUST_A1, engagementId: String(closed.id) });
    } catch (err) {
      if (err instanceof WorkOrderError) { code = err.code; status = err.statusCode; }
    }
    assert(
      code === 'ENGAGEMENT_REFERENCE_CONFLICT' && status === 409,
      'T20a resolved-vs-supplied reference conflict yields 409',
      `${code}/${status}`,
    );
  } finally {
    _setEngagementDbClient(null);
    _setWorkOrderRepository(null);
  }

  /* ---- G1-G3: GET single ---- */
  mock.reset();
  _setEngagementDbClient(mock.asEngagementClient());
  _setWorkOrderRepository(mock.asRepository());
  try {
    mock.seedWorkOrder(); // Tenant A row

    const view = await getWorkOrder(makeCtx(), 'd0000000-0000-4000-8000-00000000000a');
    assert(view.woNumber === 'TENA-CUSA-0826-001', 'G1 getWorkOrder returns own tenant row');

    let notFound = false;
    try {
      await getWorkOrder(makeCtx(), 'd9000000-0000-4000-8000-000000000009');
    } catch (err) {
      notFound = err instanceof WorkOrderError && err.code === 'NOT_FOUND' && err.statusCode === 404;
    }
    assert(notFound, 'G2 foreign/unknown id yields non-leaking 404');

    let badRequest = false;
    try {
      await getWorkOrder(makeCtx(), 'not-a-uuid');
    } catch (err) {
      badRequest = err instanceof WorkOrderError && err.statusCode === 400;
    }
    assert(badRequest, 'G3 invalid id yields 400');
  } finally {
    _setEngagementDbClient(null);
    _setWorkOrderRepository(null);
  }

  console.log('----------------------------------------------------');
  console.log(`U-04 VALIDATION SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
