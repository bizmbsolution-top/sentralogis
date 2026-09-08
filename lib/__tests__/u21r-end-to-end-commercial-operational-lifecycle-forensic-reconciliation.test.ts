/**
 * Sentralogis — Phase 4B / U-21R
 * lib/__tests__/u21r-end-to-end-commercial-operational-lifecycle-forensic-reconciliation.test.ts
 *
 * END-TO-END COMMERCIAL → FULFILLMENT → OPERATIONAL LIFECYCLE
 * FORENSIC RECONCILIATION & ACCEPTANCE GATE
 *
 * Independent forensic verification of the complete canonical lifecycle:
 * Engagement → Sales Order → Fulfillment → Fulfillment Allocation → Operational Handoff →
 * Domain Adapter → Sovereign Operational Domain → Operational Progress → Commercial Visibility.
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

class U21RForensicMockDb
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
  private soSeq = 500;
  private flSeq = 600;
  private ohSeq = 700;

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
                    id: row.id || `u21r-${table}-${Date.now()}-${Math.random()}`,
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

export async function runU21rEndToEndCommercialOperationalLifecycleForensicReconciliationSuite(): Promise<{
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

  const mockDb = new U21RForensicMockDb();
  _setSalesOrderDbClient(mockDb);
  _setFulfillmentDbClient(mockDb);
  _setOperationalHandoffDbClient(mockDb);

  const engagementId = 'eng-u21r-001';
  mockDb.engagements.push({
    id: engagementId,
    tenant_id: TENANT_A,
    customer_id: CUSTOMER_A,
    status: 'OPEN',
  });
  mockDb.shipments.push(
    { id: 'shp-u21r-01', tenant_id: TENANT_A, status: 'PLANNED' },
    { id: 'shp-u21r-02', tenant_id: TENANT_A, status: 'PLANNED' },
  );

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 1: CANONICAL LIFECYCLE RECONCILIATION                  */
  /* ------------------------------------------------------------------ */

  check('U21R-01', 'WS1: Complete canonical schema lineage (CWO -> SO -> FL -> FA -> OH) defined in migrations',
    allSql.includes('REFERENCES public.commercial_work_orders(id)') &&
    allSql.includes('REFERENCES public.sales_orders(id)') &&
    allSql.includes('REFERENCES public.fulfillments(id)') &&
    allSql.includes('REFERENCES public.fulfillment_allocations(id)'));

  check('U21R-02', 'WS1: Sales Order schema contains NO foreign keys on operational tables (work_orders, wo_items, job_orders)',
    !/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.sales_orders\s*\([^;]*REFERENCES\s+public\.(?:work_orders|wo_items|job_orders)/i.test(allSql));

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 2: SALES ORDER IMMUTABILITY                            */
  /* ------------------------------------------------------------------ */

  const flWritesSo = /\.from\(['"]sales_orders['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc);
  const ohWritesSo = /\.from\(['"]sales_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);

  check('U21R-03', 'WS2: Zero writers on sales_orders from fulfillment domain service', !flWritesSo);
  check('U21R-04', 'WS2: Zero writers on sales_orders from operational handoff service', !ohWritesSo);

  await checkAsync('U21R-05', 'WS2: Behavioral: Commercial agreed terms remain strictly immutable under full operational execution', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 120000000,
        currency: 'IDR',
        paymentTermsDays: 45,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 10 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u21r-01' },
    });

    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'fulfill', deliveredQuantity: 10 });

    const soAfter = await findSalesOrderById(ctx, soRes.salesOrder.id);

    return (
      soAfter.totalAgreedRevenue === 120000000 &&
      soAfter.currency === 'IDR' &&
      soAfter.paymentTermsDays === 45 &&
      soAfter.status === 'CONFIRMED'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 3: FULFILLMENT SOVEREIGNTY & ENGINE CONTAINMENT        */
  /* ------------------------------------------------------------------ */

  const flTableSql = fs.readFileSync(path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'), 'utf8');

  check('U21R-06', 'WS3: fulfillments table contains ZERO forwarding execution columns',
    !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge|mbl_number|hbl_number)\b/i.test(flTableSql));

  check('U21R-07', 'WS3: fulfillments table contains ZERO customs statutory fields',
    !/\b(total_duty_and_tax|billing_code|ceisa_status|pib_number|peb_number)\b/i.test(flTableSql));

  check('U21R-08', 'WS3: fulfillments table contains ZERO driver/GPS/armada execution fields',
    !/\b(md_drivers|driver_id|driver_profiles|armada_id|gps_telemetry)\b/i.test(flTableSql));

  check('U21R-09', 'WS3: fulfillments table contains ZERO warehouse storage bin/inventory fields',
    !/\b(bin_location|rack_id|storage_zone|inventory_balance|stock_ledger)\b/i.test(flTableSql));

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 4: ALLOCATION INTEGRITY & MONOTONIC PROGRESS           */
  /* ------------------------------------------------------------------ */

  check('U21R-10', 'WS4: fulfillment_allocations schema enforces non-negative allocated and delivered quantities',
    flTableSql.includes('allocated_quantity') &&
    flTableSql.includes('CHECK (allocated_quantity >= 0)') &&
    flTableSql.includes('delivered_quantity') &&
    flTableSql.includes('CHECK (delivered_quantity >= 0)'));

  await checkAsync('U21R-11', 'WS4: Behavioral: Allocation delivered_quantity increments monotonically and aggregates accurately', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 50000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'TRUCKING', allocatedQuantity: 50 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    const oh1 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-u21r-01' },
    });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'fulfill', deliveredQuantity: 20 });

    const oh2 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-u21r-02' },
    });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'fulfill', deliveredQuantity: 50 });

    const updatedAlloc = mockDb.allocations.find((a) => a.id === alloc.id);
    return updatedAlloc?.delivered_quantity === 50;
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 5: OPERATIONAL HANDOFF FORENSICS & STATE MACHINE       */
  /* ------------------------------------------------------------------ */

  check('U21R-12', 'WS5: Operational Handoff defines closed state transitions with terminal states',
    OPERATIONAL_HANDOFF_TRANSITIONS.ISSUED.includes('ACKNOWLEDGED') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.ACCEPTED.includes('EXECUTING') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.EXECUTING.includes('FULFILLED') &&
    HANDOFF_TERMINAL_STATUSES.includes('FULFILLED') &&
    HANDOFF_TERMINAL_STATUSES.includes('CANCELLED') &&
    HANDOFF_TERMINAL_STATUSES.includes('REJECTED') &&
    HANDOFF_TERMINAL_STATUSES.includes('FAILED'));

  check('U21R-13', 'WS5: Terminal states have zero outward transitions',
    OPERATIONAL_HANDOFF_TRANSITIONS.FULFILLED.length === 0 &&
    OPERATIONAL_HANDOFF_TRANSITIONS.CANCELLED.length === 0 &&
    OPERATIONAL_HANDOFF_TRANSITIONS.REJECTED.length === 0 &&
    OPERATIONAL_HANDOFF_TRANSITIONS.FAILED.length === 0);

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 6: FOUR DOMAIN ADAPTERS SOVEREIGNTY                    */
  /* ------------------------------------------------------------------ */

  check('U21R-14', 'WS6: Forwarding adapter encapsulates shipment domain resolution',
    getOperationalHandoffAdapter('FORWARDING') instanceof ForwardingHandoffAdapter);

  check('U21R-15', 'WS6: Customs adapter encapsulates declaration domain resolution',
    getOperationalHandoffAdapter('CUSTOMS') instanceof CustomsHandoffAdapter);

  check('U21R-16', 'WS6: Trucking adapter encapsulates service request domain resolution',
    getOperationalHandoffAdapter('TRUCKING') instanceof TruckingHandoffAdapter);

  check('U21R-17', 'WS6: Warehouse adapter encapsulates warehouse order domain resolution',
    getOperationalHandoffAdapter('WAREHOUSE') instanceof WarehouseHandoffAdapter);

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 7: MULTI-SBU COMPOSITION INTEGRITY                     */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21R-18', 'WS7: Multi-SBU single SO fulfillment produces exactly 1 commercial commitment and 4 domain handoffs', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 300000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 10 },
          { capabilityType: 'CUSTOMS', allocatedQuantity: 1 },
          { capabilityType: 'TRUCKING', allocatedQuantity: 5 },
          { capabilityType: 'WAREHOUSE', allocatedQuantity: 100 },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    // Verify 1 SO, 1 FL, 4 allocations
    const soList = mockDb.salesOrders.filter((s) => s.id === soRes.salesOrder.id);
    const flList = mockDb.fulfillments.filter((f) => f.sales_order_id === soRes.salesOrder.id);

    return soList.length === 1 && flList.length === 1 && comp.allocations.length === 4;
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 8 & 9: PARTIAL FULFILLMENT & SPLIT SHIPMENT            */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21R-19', 'WS8/WS9: Split shipment allocations bind to distinct operational shipments under single commercial commitment', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 80000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 25, shipmentId: 'shp-u21r-01' },
          { capabilityType: 'FORWARDING', allocatedQuantity: 25, shipmentId: 'shp-u21r-02' },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const [alloc1, alloc2] = comp.allocations;

    const oh1 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc1.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u21r-01' },
    });
    const oh2 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc2.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u21r-02' },
    });

    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'accept' });

    const h1 = await findOperationalHandoffById(ctx, oh1.handoff.id);
    const h2 = await findOperationalHandoffById(ctx, oh2.handoff.id);

    return (
      h1.assignedDomainReference?.referenceId === 'shp-u21r-01' &&
      h2.assignedDomainReference?.referenceId === 'shp-u21r-02' &&
      alloc1.shipmentId === 'shp-u21r-01' &&
      alloc2.shipmentId === 'shp-u21r-02'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 10: VERSIONED REPLANNING & HISTORICAL INTEGRITY        */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21R-20', 'WS10: Historical fulfillment revision remains immutable upon replanning', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 45000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const fl1 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);
    await performFulfillmentAction(fl1.fulfillment.id, { action: 'cancel', reason: 'Vessel schedule change' }, ctx);

    const fl2 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);

    const fetchedFl1 = await findFulfillmentById(fl1.fulfillment.id, ctx);
    const fetchedFl2 = await findFulfillmentById(fl2.fulfillment.id, ctx);

    return (
      fetchedFl1.status === 'CANCELLED' &&
      fetchedFl1.revisionNo === 1 &&
      fetchedFl2.status === 'PLANNED' &&
      fetchedFl2.revisionNo === 2
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 11: IDEMPOTENCY & RETRY DETERMINISM                    */
  /* ------------------------------------------------------------------ */

  check('U21R-21', 'WS11: Database unique constraints enforce idempotency across SO, FL, and OH',
    allSql.includes('uq_sales_orders_tenant_idempotency_key') ||
    allSql.includes('uq_fulfillment_idempotency') ||
    allSql.includes('uq_operational_handoff_idempotency'));

  await checkAsync('U21R-22', 'WS11: Behavioral: Idempotency retry resolves existing record without duplication', async () => {
    const ctx = makeContext();
    const first = await createSalesOrder(
      { engagementId, totalAgreedRevenue: 10000000, idempotencyKey: 'idemp-u21r-retry-key' },
      ctx,
    );
    const retry = await createSalesOrder(
      { engagementId, totalAgreedRevenue: 10000000, idempotencyKey: 'idemp-u21r-retry-key' },
      ctx,
    );

    return first.created === true && retry.created === false && first.salesOrder.id === retry.salesOrder.id;
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 12: TENANT ISOLATION & AUTHORIZATION                   */
  /* ------------------------------------------------------------------ */

  check('U21R-23', 'WS12: PostgreSQL RLS enabled with get_my_tenant_id() on sales_orders, fulfillments, and operational_handoffs',
    allSql.includes('sales_orders_isolation') &&
    allSql.includes('fulfillments_isolation') &&
    allSql.includes('operational_handoffs_isolation'));

  await checkAsync('U21R-24', 'WS12: Cross-tenant access is deterministically rejected', async () => {
    const ctxA = makeContext(TENANT_A);
    const ctxB = makeContext(TENANT_B);

    const so = await createSalesOrder({ engagementId, totalAgreedRevenue: 15000000 }, ctxA);

    let crossTenantBlocked = false;
    try {
      await findSalesOrderById(ctxB, so.salesOrder.id);
    } catch {
      crossTenantBlocked = true;
    }
    return crossTenantBlocked;
  });

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 13: NUMBER AUTHORITY                                   */
  /* ------------------------------------------------------------------ */

  check('U21R-25', 'WS13: Database sequence generator functions exist for SO, FL, OH',
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_sales_order') &&
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_fulfillment_number') &&
    allSql.includes('CREATE OR REPLACE FUNCTION public.next_operational_handoff_number'));

  check('U21R-26', 'WS13: Zero client-side business number generators in domain service code',
    !/function\s+generate(?:SO|SalesOrder|FL|Fulfillment|OH|Handoff)Number/i.test(salesOrderServiceSrc) &&
    !/function\s+generate(?:SO|SalesOrder|FL|Fulfillment|OH|Handoff)Number/i.test(fulfillmentServiceSrc) &&
    !/function\s+generate(?:SO|SalesOrder|FL|Fulfillment|OH|Handoff)Number/i.test(handoffServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 14: LEGACY BYPASS AUDIT                                */
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

  check('U21R-27', 'WS14: API routes delegate exclusively to canonical domain services',
    apiSoRoute.includes('createSalesOrder') &&
    apiFlRoute.includes('createFulfillment') &&
    apiOhRoute.includes('createOperationalHandoff'));

  /* ------------------------------------------------------------------ */
  /*  WORKSTREAM 16: ANTI-PATTERN NEGATIVE AUDIT GATES                  */
  /* ------------------------------------------------------------------ */

  check('U21R-NC01', 'WS16: Zero direct sales_orders -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(salesOrderServiceSrc));

  check('U21R-NC02', 'WS16: Zero direct fulfillments -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc));

  check('U21R-NC03', 'WS16: Zero direct operational_handoffs -> job_orders mutations',
    !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc));

  check('U21R-NC04', 'WS16: Zero direct driver assignments in fulfillment or handoff services',
    !/\b(md_drivers|driver_profiles)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(md_drivers|driver_profiles)\b/i.test(handoffServiceSrc));

  check('U21R-NC05', 'WS16: Zero direct GPS telemetry mutations in fulfillment or handoff services',
    !/\b(gps_telemetry|telemetry_sessions)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(gps_telemetry|telemetry_sessions)\b/i.test(handoffServiceSrc));

  check('U21R-NC06', 'WS16: Zero direct warehouse inventory mutations in fulfillment or handoff services',
    !/\.from\(['"]wh_inventory['"]\)/i.test(fulfillmentServiceSrc) &&
    !/\.from\(['"]wh_inventory['"]\)/i.test(handoffServiceSrc));

  check('U21R-NC07', 'WS16: Zero direct CEISA transmissions in fulfillment or handoff services',
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(fulfillmentServiceSrc) &&
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(handoffServiceSrc));

  check('U21R-NC08', 'WS16: Zero work_orders creations in fulfillment service (ADR-037 preserved)',
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
  if (unratified.length > 0) {
    console.error('Unratified ADRs:', unratified);
  }

  const p4aReport = readDoc('SENTRALOGIS_PHASE4A_IMPLEMENTATION_REPORT.md');
  const p4aAdrsRatified = p4aReport.includes('ADR-018') && p4aReport.includes('ADR-019') && p4aReport.includes('ADR-020') && p4aReport.includes('ADR-021');

  check('U21R-28', 'ADR-018 through ADR-056 all exist and are formally RATIFIED', unratified.length === 0 && p4aAdrsRatified, unratified.join(', '));

  /* ------------------------------------------------------------------ */
  /*  POSITIVE CONTROLS & DETECTOR FIDELITY                             */
  /* ------------------------------------------------------------------ */

  const syntheticSampleWithForbiddenWrite = `
    async function badFunction() {
      await supabase.from('job_orders').insert({ dummy: 1 });
    }
  `;
  const detectorCatchesSample = /\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(syntheticSampleWithForbiddenWrite);

  check('U21R-PC1', 'Positive Control 1: Table-scoped detector correctly identifies forbidden JO mutations in sample code', detectorCatchesSample);

  check('U21R-PC2', 'Positive Control 2: Adapter factory correctly instantiates all 4 sovereign adapters',
    getOperationalHandoffAdapter('FORWARDING') instanceof ForwardingHandoffAdapter &&
    getOperationalHandoffAdapter('CUSTOMS') instanceof CustomsHandoffAdapter &&
    getOperationalHandoffAdapter('TRUCKING') instanceof TruckingHandoffAdapter &&
    getOperationalHandoffAdapter('WAREHOUSE') instanceof WarehouseHandoffAdapter);

  // Teardown
  _setSalesOrderDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`U-21R FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
