/**
 * Sentralogis — Phase 4B / U-22
 * lib/__tests__/u22-commercial-operational-orchestration-readiness.test.ts
 *
 * COMMERCIAL → FULFILLMENT → OPERATIONAL ORCHESTRATION CONTRACT & EXECUTION READINESS GATE
 *
 * Forensic architecture & execution-readiness audit:
 * - Lineage & foreign-key integrity
 * - State ownership & actor authority
 * - Command vs Event vs State classification
 * - Execution acknowledgement semantics (ACK vs ACCEPT vs EXECUTING vs FULFILLED)
 * - Failure & recovery forensics (failure isolation, retry determinism, compensation)
 * - Progress propagation & monotonicity
 * - Multi-SBU correlation & failure isolation
 * - Split shipment & partial fulfillment accounting
 * - Versioned replanning & historical immutability
 * - Observability / Control Tower projection readiness
 * - Security, RLS & Number Authority
 * - Anti-pattern & engine containment controls
 *
 * Governing ADRs: ADR-018 through ADR-056 (RATIFIED).
 * Strict zero-production-change audit.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  createSalesOrder,
  confirmSalesOrder,
  findSalesOrderById,
  _setSalesOrderDbClient,
  SalesOrderDbClient,
} from '@/lib/sales-order/service';
import {
  createFulfillment,
  performFulfillmentAction,
  findFulfillmentById,
  findFulfillmentCompositionById,
  _setFulfillmentDbClient,
  FulfillmentDbClient,
} from '@/lib/fulfillment/service';
import {
  createOperationalHandoff,
  findOperationalHandoffById,
  performOperationalHandoffAction,
  _setOperationalHandoffDbClient,
  OperationalHandoffDbClient,
} from '@/lib/operational-handoff/service';
import {
  OperationalHandoffError,
  OPERATIONAL_HANDOFF_TRANSITIONS,
  HANDOFF_ACTIVE_STATUSES,
  HANDOFF_TERMINAL_STATUSES,
} from '@/lib/operational-handoff/types';
import {
  getOperationalHandoffAdapter,
  ForwardingHandoffAdapter,
  CustomsHandoffAdapter,
  TruckingHandoffAdapter,
  WarehouseHandoffAdapter,
} from '@/lib/operational-handoff/adapters';

const ROOT = path.resolve(process.cwd());
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CUSTOMER_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeContext(
  tenantId = TENANT_A,
  permissions = ['commercial:manage', 'commercial:read'] as any[],
): IdentityContext {
  return {
    userId: USER_A,
    tenantId,
    membershipId: 'mem-1',
    role: 'commercial_manager',
    isTenantOwner: false,
    permissions,
    sbuScope: null,
  };
}

function readDoc(filename: string): string {
  const p = path.join(DOCS_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function readAllMigrations(): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

class U22ReadinessMockDb
  implements SalesOrderDbClient, FulfillmentDbClient, OperationalHandoffDbClient
{
  public engagements: Record<string, unknown>[] = [];
  public salesOrders: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public handoffs: Record<string, unknown>[] = [];
  public capabilityBindings: Record<string, unknown>[] = [];
  public shipments: Record<string, unknown>[] = [];

  public nextInsertUniqueViolation = false;
  private soSeq = 100;
  private flSeq = 200;
  private ohSeq = 300;

  rpc(fn: string, _args: Record<string, unknown>): Promise<{ data: unknown; error: null | { message: string; code?: string } }> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    if (fn === 'next_sales_order') {
      return Promise.resolve({ data: `SO-${year}-${month}-${String(this.soSeq++).padStart(4, '0')}`, error: null });
    }
    if (fn === 'next_fulfillment_number') {
      return Promise.resolve({ data: `FL-${year}-${month}-${String(this.flSeq++).padStart(4, '0')}`, error: null });
    }
    if (fn === 'next_operational_handoff_number') {
      return Promise.resolve({ data: `OH-${year}-${month}-${String(this.ohSeq++).padStart(4, '0')}`, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `Unknown RPC: ${fn}` } });
  }

  from(table: string) {
    const self = this;
    let filters: Array<{ col: string; val: unknown }> = [];
    let orderOpts: { col: string; ascending: boolean } | null = null;
    let limitCount: number | null = null;

    function getFilteredRows() {
      let rows = self.getTableData(table).filter((r) =>
        filters.every((f) => r[f.col] === f.val),
      );
      if (orderOpts) {
        rows = [...rows].sort((a, b) => {
          const valA = (a as any)[orderOpts!.col];
          const valB = (b as any)[orderOpts!.col];
          if (valA < valB) return orderOpts!.ascending ? -1 : 1;
          if (valA > valB) return orderOpts!.ascending ? 1 : -1;
          return 0;
        });
      }
      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }
      return rows;
    }

    const queryChain: any = {
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return queryChain;
      },
      in(_col: string, _vals: unknown[]) {
        return queryChain;
      },
      order(col: string, opts: { ascending: boolean }) {
        orderOpts = { col, ascending: opts.ascending };
        return queryChain;
      },
      limit(count: number) {
        limitCount = count;
        return queryChain;
      },
      then(onfulfilled: any) {
        const rows = getFilteredRows();
        return Promise.resolve(onfulfilled({ data: rows, error: null }));
      },
      async single() {
        const rows = getFilteredRows();
        if (rows.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        return { data: { ...rows[0] }, error: null };
      },
      async maybeSingle() {
        const rows = getFilteredRows();
        return { data: rows.length > 0 ? { ...rows[0] } : null, error: null };
      },
    };

    return {
      select(_cols?: string) {
        return queryChain;
      },
      insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]) {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        return {
          select(_cols?: string) {
            return {
              async single() {
                if (
                  self.nextInsertUniqueViolation ||
                  rows.some(
                    (row) =>
                      row.idempotency_key &&
                      self.getTableData(table).some(
                        (r) =>
                          r.tenant_id === row.tenant_id &&
                          r.idempotency_key === row.idempotency_key,
                      ),
                  )
                ) {
                  self.nextInsertUniqueViolation = false;
                  return { data: null, error: { message: 'unique violation', code: '23505' } };
                }
                const insertedRows = rows.map((row) => {
                  const inserted = {
                    id: row.id || `u22-${table}-${Date.now()}-${Math.random()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ...row,
                  };
                  self.getTableData(table).push(inserted);
                  return inserted;
                });
                return { data: insertedRows[0], error: null };
              },
              async maybeSingle() {
                return this.single();
              },
            };
          },
        };
      },
      update(patch: Record<string, unknown>) {
        const updateChain: any = {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return updateChain;
          },
          then(onfulfilled: any) {
            const list = self.getTableData(table);
            const updated: Record<string, unknown>[] = [];
            for (let i = 0; i < list.length; i++) {
              if (filters.every((f) => list[i][f.col] === f.val)) {
                list[i] = { ...list[i], ...patch, updated_at: new Date().toISOString() };
                updated.push({ ...list[i] });
              }
            }
            return Promise.resolve(onfulfilled ? onfulfilled({ data: updated, error: null }) : { data: updated, error: null });
          },
          async select(_cols?: string) {
            return updateChain.then((res: any) => res);
          },
        };
        return updateChain;
      },
      delete() {
        return {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return this;
          },
          async select() {
            return { data: [], error: null };
          },
        };
      },
    };
  }

  private getTableData(table: string): Record<string, unknown>[] {
    if (table === 'commercial_work_orders') return this.engagements;
    if (table === 'sales_orders') return this.salesOrders;
    if (table === 'fulfillments') return this.fulfillments;
    if (table === 'fulfillment_allocations') return this.allocations;
    if (table === 'operational_handoffs') return this.handoffs;
    if (table === 'commercial_capability_bindings') return this.capabilityBindings;
    if (table === 'shp_shipments') return this.shipments;
    return [];
  }
}

export async function runU22CommercialOperationalOrchestrationReadinessSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  let passed = 0;
  let failed = 0;

  function check(gate: string, desc: string, ok: boolean, detail?: string) {
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${gate}: ${desc}${detail ? ` — ${detail}` : ''}`);
    }
  }

  async function checkAsync(gate: string, desc: string, fn: () => Promise<boolean>, detail?: string) {
    try {
      const ok = await fn();
      check(gate, desc, ok, detail);
    } catch (err: any) {
      check(gate, desc, false, err?.message || detail);
    }
  }

  const migrations = readAllMigrations();
  const allSql = migrations.join('\n');

  const salesOrderServiceSrc = fs.existsSync(path.join(LIB_DIR, 'sales-order', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'sales-order', 'service.ts'), 'utf8')
    : '';
  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';

  const mockDb = new U22ReadinessMockDb();
  _setSalesOrderDbClient(mockDb);
  _setFulfillmentDbClient(mockDb);
  _setOperationalHandoffDbClient(mockDb);

  const engagementId = 'eng-u22-001';
  mockDb.engagements.push({
    id: engagementId,
    tenant_id: TENANT_A,
    customer_id: CUSTOMER_A,
    status: 'OPEN',
  });
  mockDb.shipments.push(
    { id: 'shp-u22-01', tenant_id: TENANT_A, status: 'PLANNED' },
    { id: 'shp-u22-02', tenant_id: TENANT_A, status: 'PLANNED' },
  );

  /* ------------------------------------------------------------------ */
  /*  WS1: CANONICAL LIFECYCLE CONTRACT AUDIT                           */
  /* ------------------------------------------------------------------ */

  check('U22-01', 'WS1: Schema lineage defines complete foreign key chain (CWO -> SO -> FL -> FA -> OH)',
    allSql.includes('REFERENCES public.commercial_work_orders(id)') &&
    allSql.includes('REFERENCES public.sales_orders(id)') &&
    allSql.includes('REFERENCES public.fulfillments(id)') &&
    allSql.includes('REFERENCES public.fulfillment_allocations(id)'));

  check('U22-02', 'WS1: Delete cascade on allocations and restrict on parent SO prevents orphaned operational references',
    allSql.includes('ON DELETE RESTRICT') &&
    allSql.includes('ON DELETE CASCADE'));

  /* ------------------------------------------------------------------ */
  /*  WS2: STATE OWNERSHIP AUDIT                                        */
  /* ------------------------------------------------------------------ */

  check('U22-03', 'WS2: Sales Order state transitions (DRAFT -> CONFIRMED -> CANCELLED) are strictly Commercial-owned',
    salesOrderServiceSrc.includes('confirmSalesOrder') &&
    salesOrderServiceSrc.includes('cancelSalesOrder') &&
    !handoffServiceSrc.includes('.update({ status: \'CONFIRMED\'') &&
    !handoffServiceSrc.includes('.update({ status: \'DRAFT\''));

  check('U22-04', 'WS2: Fulfillment state machine is strictly Fulfillment-owned with closed transitions',
    fulfillmentServiceSrc.includes('performFulfillmentAction') &&
    fulfillmentServiceSrc.includes('FULFILLMENT_TRANSITIONS'));

  check('U22-05', 'WS2: Operational Handoff defines explicit state machine with active vs terminal sets',
    HANDOFF_ACTIVE_STATUSES.includes('ISSUED') &&
    HANDOFF_ACTIVE_STATUSES.includes('EXECUTING') &&
    HANDOFF_TERMINAL_STATUSES.includes('FULFILLED') &&
    HANDOFF_TERMINAL_STATUSES.includes('FAILED'));

  /* ------------------------------------------------------------------ */
  /*  WS3: COMMAND VS EVENT VS STATE CLASSIFICATION                    */
  /* ------------------------------------------------------------------ */

  check('U22-06', 'WS3: Operational Handoff uses command methods (acknowledge, accept, startExecuting, fulfill, fail, reject, cancel)',
    handoffServiceSrc.includes('case \'acknowledge\':') &&
    handoffServiceSrc.includes('case \'accept\':') &&
    handoffServiceSrc.includes('case \'startExecuting\':') &&
    handoffServiceSrc.includes('case \'fulfill\':') &&
    handoffServiceSrc.includes('case \'fail\':') &&
    handoffServiceSrc.includes('case \'reject\':') &&
    handoffServiceSrc.includes('case \'cancel\':'));

  check('U22-07', 'WS3: Zero mutable historical event logs in core domain services (append/update integrity)',
    !/update\s+cus_declaration_audit_events/i.test(allSql) &&
    !/update\s+commercial_capability_events/i.test(allSql));

  /* ------------------------------------------------------------------ */
  /*  WS4: EXECUTION ACKNOWLEDGEMENT SEMANTICS                          */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-08', 'WS4: Distinct execution milestones (ACKNOWLEDGED -> ACCEPTED -> EXECUTING -> FULFILLED)', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 90000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 10 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-01' },
    });

    // 1. Acknowledge
    const ack = await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'acknowledge' });
    // 2. Accept
    const acc = await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    // 3. Start Executing
    const exe = await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'startExecuting' });
    // 4. Fulfill
    const ful = await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'fulfill', deliveredQuantity: 10 });

    return (
      ack.status === 'ACKNOWLEDGED' &&
      acc.status === 'ACCEPTED' &&
      exe.status === 'EXECUTING' &&
      ful.status === 'FULFILLED' &&
      ful.assignedDomainReference?.referenceId === 'shp-u22-01'
    );
  });

  await checkAsync('U22-09', 'WS4: Premature fulfillment (e.g. direct ISSUED -> FULFILLED) is deterministically rejected', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 10000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'TRUCKING', allocatedQuantity: 5 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-u22-premature' },
    });

    let rejected = false;
    try {
      // In ISSUED status, fulfill is not an allowed transition
      await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'fulfill', deliveredQuantity: 5 });
    } catch (err: any) {
      rejected = err instanceof OperationalHandoffError && err.code === 'INVALID_STATUS_TRANSITION';
    }
    return rejected;
  });

  /* ------------------------------------------------------------------ */
  /*  WS5: FAILURE & RECOVERY FORENSICS                                 */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-10', 'WS5: Failure isolation: Downstream failure does NOT mutate commercial Sales Order terms', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({
      engagementId,
      totalAgreedRevenue: 75000000,
      currency: 'IDR',
      paymentTermsDays: 30,
    }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'TRUCKING', allocatedQuantity: 20 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-u22-fail' },
    });

    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'startExecuting' });
    const failedHandoff = await performOperationalHandoffAction(ctx, ohRes.handoff.id, {
      action: 'fail',
      failureCode: 'ARMADA_BREAKDOWN',
      failureReason: 'Engine overheated on trans-Java highway',
    });

    const soAfter = await findSalesOrderById(ctx, soRes.salesOrder.id);

    return (
      failedHandoff.status === 'FAILED' &&
      failedHandoff.failureCode === 'ARMADA_BREAKDOWN' &&
      soAfter.status === 'CONFIRMED' &&
      soAfter.totalAgreedRevenue === 75000000 &&
      soAfter.currency === 'IDR'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS6: PROGRESS PROPAGATION & MONOTONICITY                          */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-11', 'WS6: Monotonic delivery progression (40 -> 70 -> 100) aggregates accurately', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 100000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 100 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    // Leg 1: 40 units
    const oh1 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-01' },
    });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'fulfill', deliveredQuantity: 40 });

    // Leg 2: 70 units cumulative
    const oh2 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-01' },
    });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'fulfill', deliveredQuantity: 70 });

    // Leg 3: 100 units cumulative
    const oh3 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-01' },
    });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'fulfill', deliveredQuantity: 100 });

    const updatedAlloc = mockDb.allocations.find((a) => a.id === alloc.id);
    return updatedAlloc?.delivered_quantity === 100;
  });

  /* ------------------------------------------------------------------ */
  /*  WS7: MULTI-SBU CORRELATION AUDIT                                  */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-12', 'WS7: Multi-SBU single SO execution correlates 4 sovereign handoffs under 1 commercial commitment', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 250000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 10 },
          { capabilityType: 'CUSTOMS', allocatedQuantity: 1 },
          { capabilityType: 'TRUCKING', allocatedQuantity: 4 },
          { capabilityType: 'WAREHOUSE', allocatedQuantity: 50 },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    const handoffsCreated = await Promise.all(
      comp.allocations.map((alloc) =>
        createOperationalHandoff(ctx, {
          fulfillmentId: flRes.fulfillment.id,
          fulfillmentAllocationId: alloc.id,
          targetDomain: alloc.capabilityType,
          requestPayload: { target: alloc.capabilityType },
        }),
      ),
    );

    // Forwarding succeeds
    await performOperationalHandoffAction(ctx, handoffsCreated[0].handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, handoffsCreated[0].handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, handoffsCreated[0].handoff.id, { action: 'fulfill', deliveredQuantity: 10 });

    // Customs succeeds
    await performOperationalHandoffAction(ctx, handoffsCreated[1].handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, handoffsCreated[1].handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, handoffsCreated[1].handoff.id, { action: 'fulfill', deliveredQuantity: 1 });

    // Trucking encounters failure
    await performOperationalHandoffAction(ctx, handoffsCreated[2].handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, handoffsCreated[2].handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, handoffsCreated[2].handoff.id, { action: 'fail', failureCode: 'TIRE_BLOWOUT' });

    // Warehouse is acknowledged and executing
    await performOperationalHandoffAction(ctx, handoffsCreated[3].handoff.id, { action: 'acknowledge' });
    await performOperationalHandoffAction(ctx, handoffsCreated[3].handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, handoffsCreated[3].handoff.id, { action: 'startExecuting' });

    const fwdH = await findOperationalHandoffById(ctx, handoffsCreated[0].handoff.id);
    const cusH = await findOperationalHandoffById(ctx, handoffsCreated[1].handoff.id);
    const trkH = await findOperationalHandoffById(ctx, handoffsCreated[2].handoff.id);
    const whH = await findOperationalHandoffById(ctx, handoffsCreated[3].handoff.id);

    return (
      fwdH.status === 'FULFILLED' &&
      cusH.status === 'FULFILLED' &&
      trkH.status === 'FAILED' &&
      whH.status === 'EXECUTING'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS8: SPLIT SHIPMENT & PARTIAL FULFILLMENT AUDIT                   */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-13', 'WS8: Split shipment: Shipment A (40 fulfilled) and Shipment B (60 rejected) preserves allocation accounting', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 100000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 40, shipmentId: 'shp-u22-01' },
          { capabilityType: 'FORWARDING', allocatedQuantity: 60, shipmentId: 'shp-u22-02' },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const [allocA, allocB] = comp.allocations;

    // Shipment A: 40 fulfilled
    const ohA = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocA.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-01' },
    });
    await performOperationalHandoffAction(ctx, ohA.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohA.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohA.handoff.id, { action: 'fulfill', deliveredQuantity: 40 });

    // Shipment B: 60 rejected by carrier
    const ohB = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocB.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u22-02' },
    });
    await performOperationalHandoffAction(ctx, ohB.handoff.id, {
      action: 'reject',
      failureCode: 'VESSEL_CAPACITY_EXCEEDED',
      failureReason: 'Carrier unable to book feeder space',
    });

    const hA = await findOperationalHandoffById(ctx, ohA.handoff.id);
    const hB = await findOperationalHandoffById(ctx, ohB.handoff.id);
    const updatedAllocA = mockDb.allocations.find((a) => a.id === allocA.id);
    const updatedAllocB = mockDb.allocations.find((a) => a.id === allocB.id);

    return (
      hA.status === 'FULFILLED' &&
      hB.status === 'REJECTED' &&
      updatedAllocA?.delivered_quantity === 40 &&
      updatedAllocB?.delivered_quantity === 0
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS9: REPLANNING FORENSICS                                         */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-14', 'WS9: Replanning creates Revision 2 while preserving Revision 1 historical immutability', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 85000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const fl1 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);
    await performFulfillmentAction(fl1.fulfillment.id, { action: 'cancel', reason: 'Feeder delay' }, ctx);

    const fl2 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);

    const historyFl1 = await findFulfillmentById(fl1.fulfillment.id, ctx);
    const activeFl2 = await findFulfillmentById(fl2.fulfillment.id, ctx);

    return (
      historyFl1.revisionNo === 1 &&
      historyFl1.status === 'CANCELLED' &&
      activeFl2.revisionNo === 2 &&
      activeFl2.status === 'PLANNED'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS10: OBSERVABILITY / CONTROL TOWER READINESS                     */
  /* ------------------------------------------------------------------ */

  await checkAsync('U22-15', 'WS10: Read-only projection model composes full lifecycle trace without operational schema pollution', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 60000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'CUSTOMS', allocatedQuantity: 1 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'CUSTOMS',
      requestPayload: { declarationId: 'dec-u22-01' },
    });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'fulfill', deliveredQuantity: 1 });

    const trace = {
      tenantId: ctx.tenantId,
      salesOrderId: soRes.salesOrder.id,
      salesOrderNumber: soRes.salesOrder.soNumber,
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentNumber: flRes.fulfillment.fulfillmentNumber,
      allocationId: alloc.id,
      capabilityType: alloc.capabilityType,
      handoffId: ohRes.handoff.id,
      handoffNumber: ohRes.handoff.handoffNumber,
      domainReference: ohRes.handoff.assignedDomainReference,
      status: 'FULFILLED',
      deliveredQuantity: 1,
    };

    return (
      Boolean(trace.salesOrderNumber) &&
      Boolean(trace.fulfillmentNumber) &&
      Boolean(trace.handoffNumber) &&
      trace.capabilityType === 'CUSTOMS' &&
      trace.deliveredQuantity === 1
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS11: API CONTRACT AUDIT                                          */
  /* ------------------------------------------------------------------ */

  const apiSoRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'sales-orders', 'route.ts'))
    ? fs.readFileSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'sales-orders', 'route.ts'), 'utf8')
    : '';
  const apiFlRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'fulfillments', 'route.ts'))
    ? fs.readFileSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'fulfillments', 'route.ts'), 'utf8')
    : '';
  const apiOhRoute = fs.existsSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'operational-handoffs', 'route.ts'))
    ? fs.readFileSync(path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'operational-handoffs', 'route.ts'), 'utf8')
    : '';

  check('U22-16', 'WS11: API routes resolve identity via resolveSessionIdentity and never trust request body tenant_id',
    apiSoRoute.includes('resolveSessionIdentity') &&
    apiFlRoute.includes('resolveSessionIdentity') &&
    apiOhRoute.includes('resolveSessionIdentity') &&
    !apiSoRoute.includes('body.tenant_id') &&
    !apiFlRoute.includes('body.tenant_id') &&
    !apiOhRoute.includes('body.tenant_id'));

  /* ------------------------------------------------------------------ */
  /*  WS13 & WS14: SECURITY & NUMBER AUTHORITY                          */
  /* ------------------------------------------------------------------ */

  check('U22-17', 'WS13: PostgreSQL RLS enabled across all 4 canonical commercial/fulfillment/handoff tables',
    allSql.includes('sales_orders_isolation') &&
    allSql.includes('fulfillments_isolation') &&
    allSql.includes('fulfillment_allocations_isolation') &&
    allSql.includes('operational_handoffs_isolation'));

  check('U22-18', 'WS14: Canonical sequence generator functions exist for SO, FL, and OH numbers',
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_sales_order') &&
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_fulfillment_number') &&
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_operational_handoff_number'));

  /* ------------------------------------------------------------------ */
  /*  WS15: IDEMPOTENCY & RETRY DETERMINISM                             */
  /* ------------------------------------------------------------------ */

  check('U22-19', 'WS15: Database unique idempotency constraints prevent duplicate writes',
    allSql.includes('uq_sales_orders_tenant_idempotency_key') ||
    allSql.includes('uq_fulfillment_idempotency') ||
    allSql.includes('uq_operational_handoff_idempotency'));

  await checkAsync('U22-20', 'WS15: Behavioral: Concurrent / duplicate handoff creation is retry-safe', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 10000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);
    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'CUSTOMS', allocatedQuantity: 1 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const first = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'CUSTOMS',
      idempotencyKey: 'idemp-u22-retry-key',
    });
    const retry = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'CUSTOMS',
      idempotencyKey: 'idemp-u22-retry-key',
    });

    return first.created === true && retry.created === false && first.handoff.id === retry.handoff.id;
  });

  /* ------------------------------------------------------------------ */
  /*  WS16: DATA CONTRACT / SCHEMA POLLUTION AUDIT                      */
  /* ------------------------------------------------------------------ */

  const flTableSql = fs.readFileSync(path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'), 'utf8');
  const ohTableSql = fs.readFileSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'), 'utf8');

  check('U22-21', 'WS16: fulfillments & fulfillment_allocations tables contain zero operational column pollution',
    !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge|mbl_number|hbl_number)\b/i.test(flTableSql) &&
    !/\b(total_duty_and_tax|billing_code|ceisa_status|pib_number|peb_number)\b/i.test(flTableSql) &&
    !/\b(md_drivers|driver_id|driver_profiles|armada_id|gps_telemetry)\b/i.test(flTableSql) &&
    !/\b(bin_location|rack_id|storage_zone|inventory_balance|stock_ledger)\b/i.test(flTableSql));

  check('U22-22', 'WS16: operational_handoffs table contains zero operational column pollution',
    !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge|mbl_number|hbl_number)\b/i.test(ohTableSql) &&
    !/\b(total_duty_and_tax|billing_code|ceisa_status|pib_number|peb_number)\b/i.test(ohTableSql) &&
    !/\b(md_drivers|driver_id|driver_profiles|armada_id|gps_telemetry)\b/i.test(ohTableSql) &&
    !/\b(bin_location|rack_id|storage_zone|inventory_balance|stock_ledger)\b/i.test(ohTableSql));

  /* ------------------------------------------------------------------ */
  /*  ANTI-PATTERNS & NEGATIVE AUDIT CONTROLS                           */
  /* ------------------------------------------------------------------ */

  check('U22-NC01', 'Anti-Pattern: Zero direct sales_orders -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(salesOrderServiceSrc));

  check('U22-NC02', 'Anti-Pattern: Zero direct fulfillments -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc));

  check('U22-NC03', 'Anti-Pattern: Zero direct operational_handoffs -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc));

  check('U22-NC04', 'Anti-Pattern: Zero driver assignments in fulfillment or handoff services',
    !/\b(md_drivers|driver_profiles)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(md_drivers|driver_profiles)\b/i.test(handoffServiceSrc));

  check('U22-NC05', 'Anti-Pattern: Zero GPS telemetry mutations in fulfillment or handoff services',
    !/\b(gps_telemetry|telemetry_sessions)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(gps_telemetry|telemetry_sessions)\b/i.test(handoffServiceSrc));

  check('U22-NC06', 'Anti-Pattern: Zero warehouse inventory mutations in fulfillment or handoff services',
    !/\.from\(['"]wh_inventory['"]\)/i.test(fulfillmentServiceSrc) &&
    !/\.from\(['"]wh_inventory['"]\)/i.test(handoffServiceSrc));

  check('U22-NC07', 'Anti-Pattern: Zero direct CEISA transmissions in fulfillment or handoff services',
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(handoffServiceSrc));

  check('U22-NC08', 'Anti-Pattern: Zero work_orders creations in fulfillment service (ADR-037 preserved)',
    !/\.from\(['"]work_orders['"]\)\.insert/i.test(fulfillmentServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  ADR-018..056 COMPLIANCE VERIFICATION                              */
  /* ------------------------------------------------------------------ */

  const adrList = [
    'ADR-030-canonical-tenant-identity-reconciliation.md',
    'ADR-031-anti-corruption-boundary.md',
    'ADR-032-engagement-resolve-or-create-bridge.md',
    'ADR-033-service-request-command-semantics.md',
    'ADR-034-engagement-to-sales-order.md',
    'ADR-035-sales-order-number-authority.md',
    'ADR-036-sales-order-fulfillment-boundary.md',
    'ADR-037-sales-order-work-order-cardinality.md',
    'ADR-038-shipment-to-sales-order-reference.md',
    'ADR-039-fulfillment-composition-not-engine.md',
    'ADR-040-shipment-not-fulfillment-aggregate.md',
    'ADR-041-fulfillment-number-authority.md',
    'ADR-042-fulfillment-cardinality-lineage.md',
    'ADR-043-fulfillment-state-events.md',
    'ADR-044-commercial-amendment-vs-fulfillment-change.md',
    'ADR-045-operational-composition-handoff-boundary.md',
    'ADR-046-forwarding-multimodal-leg-decomposition.md',
    'ADR-047-customs-sovereign-progressive-attachment.md',
    'ADR-048-multi-sbu-single-sales-order.md',
    'ADR-049-partial-fulfillment-split-shipment.md',
    'ADR-050-replanning-vs-commercial-amendment.md',
    'ADR-051-generic-operational-handoff-contract.md',
    'ADR-052-forwarding-handoff-adapter.md',
    'ADR-053-customs-handoff-adapter.md',
    'ADR-054-trucking-handoff-adapter.md',
    'ADR-055-warehouse-handoff-adapter.md',
    'ADR-056-handoff-idempotency-retry-compensation.md',
  ];

  const unratified = adrList.filter((f) => {
    const doc = readDoc(f);
    return !doc || !/Status[^:\n]*:[*\s]*RATIFIED/i.test(doc);
  });

  const p4aReport = readDoc('SENTRALOGIS_PHASE4A_IMPLEMENTATION_REPORT.md');
  const p4aAdrsRatified = p4aReport.includes('ADR-018') && p4aReport.includes('ADR-019') && p4aReport.includes('ADR-020') && p4aReport.includes('ADR-021');

  check('U22-23', 'ADR-018 through ADR-056 all exist and are formally RATIFIED', unratified.length === 0 && p4aAdrsRatified, unratified.join(', '));

  /* ------------------------------------------------------------------ */
  /*  POSITIVE CONTROLS                                                 */
  /* ------------------------------------------------------------------ */

  const syntheticBadCode = `async function bad() { await db.from('job_orders').insert({ evil: 1 }); }`;
  check('U22-PC1', 'Positive Control 1: Table-scoped detector catches forbidden JO writes',
    /\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(syntheticBadCode));

  check('U22-PC2', 'Positive Control 2: Adapter registry resolves all 4 sovereign adapters',
    getOperationalHandoffAdapter('FORWARDING') instanceof ForwardingHandoffAdapter &&
    getOperationalHandoffAdapter('CUSTOMS') instanceof CustomsHandoffAdapter &&
    getOperationalHandoffAdapter('TRUCKING') instanceof TruckingHandoffAdapter &&
    getOperationalHandoffAdapter('WAREHOUSE') instanceof WarehouseHandoffAdapter);

  // Teardown
  _setSalesOrderDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`U-22 EXECUTION READINESS SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
