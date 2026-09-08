/**
 * Sentralogis — Phase 4B / U-21
 * lib/__tests__/u21-end-to-end-commercial-operational-lifecycle.test.ts
 *
 * END-TO-END COMMERCIAL → FULFILLMENT → OPERATIONAL EXECUTION LIFECYCLE
 *
 * Comprehensive end-to-end integration test suite verifying the complete canonical lineage:
 * Commercial Intent → Engagement → Sales Order → Fulfillment → Fulfillment Allocation →
 * Operational Handoff → Domain Adapter → Sovereign Operational Domain → Progress Propagation → Commercial Visibility.
 *
 * Governing ADRs: ADR-018 through ADR-056.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
import {
  createSalesOrder,
  confirmSalesOrder,
  findSalesOrderById,
  _setSalesOrderDbClient,
  SalesOrderDbClient,
} from '@/lib/sales-order/service';
import {
  createFulfillment,
  addFulfillmentAllocation,
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
  TargetDomain,
  OPERATIONAL_HANDOFF_TRANSITIONS,
} from '@/lib/operational-handoff/types';
import {
  getOperationalHandoffAdapter,
  ForwardingHandoffAdapter,
  CustomsHandoffAdapter,
  TruckingHandoffAdapter,
  WarehouseHandoffAdapter,
} from '@/lib/operational-handoff/adapters';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CUSTOMER_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function makeContext(
  tenantId = TENANT_A,
  permissions: IdentityPermission[] = ['commercial:manage', 'commercial:read'],
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

// Unified End-to-End Mock DB for Commercial -> Fulfillment -> Handoff
class U21LifecycleMockDb
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
                    id: row.id || `u21-${table}-${Date.now()}-${Math.random()}`,
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

export async function runU21EndToEndCommercialOperationalLifecycleSuite(): Promise<{
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

  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const salesOrderServiceSrc = fs.existsSync(path.join(LIB_DIR, 'sales-order', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'sales-order', 'service.ts'), 'utf8')
    : '';

  const mockDb = new U21LifecycleMockDb();
  _setSalesOrderDbClient(mockDb);
  _setFulfillmentDbClient(mockDb);
  _setOperationalHandoffDbClient(mockDb);

  const engagementId = 'eng-u21-001';
  mockDb.engagements.push({
    id: engagementId,
    tenant_id: TENANT_A,
    customer_id: CUSTOMER_A,
    status: 'OPEN',
  });

  // Seed split shipment records
  mockDb.shipments.push(
    { id: 'shp-split-01', tenant_id: TENANT_A, status: 'PLANNED' },
    { id: 'shp-split-02', tenant_id: TENANT_A, status: 'PLANNED' },
  );

  /* ------------------------------------------------------------------ */
  /*  SECTION 1: SCENARIO E2E-01 — SINGLE SBU FORWARDING                */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-01', 'E2E-01 Forwarding: SO -> FL -> Allocation -> Handoff -> Forwarding Adapter -> Progress', async () => {
    const ctx = makeContext();
    // 1. Create Sales Order
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 75000000,
      },
      ctx,
    );
    // 2. Confirm Sales Order
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    // 3. Create Fulfillment Plan
    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 5 },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    // 4. Create Operational Handoff
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-e2e-01', shipmentNumber: 'SHP-2026-08-0101' },
    });

    // 5. Execute Handoff lifecycle
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'acknowledge' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'startExecuting' });
    const fulfilled = await performOperationalHandoffAction(ctx, ohRes.handoff.id, {
      action: 'fulfill',
      deliveredQuantity: 5,
    });

    // Verify upward progress
    const updatedAlloc = mockDb.allocations.find((a) => a.id === alloc.id);
    const so = await findSalesOrderById(ctx, soRes.salesOrder.id);

    return (
      fulfilled.status === 'FULFILLED' &&
      fulfilled.assignedDomainReference?.referenceType === 'SHIPMENT' &&
      updatedAlloc?.delivered_quantity === 5 &&
      so.status === 'CONFIRMED' &&
      so.totalAgreedRevenue === 75000000
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 2: SCENARIO E2E-02 — TRUCKING SBU LINEAGE                 */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-02', 'E2E-02 Trucking: SO -> FL -> Allocation -> Handoff -> Trucking Adapter -> SR Lineage', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 25000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'TRUCKING', allocatedQuantity: 10 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-e2e-02', requestNumber: 'SR-2026-08-0102' },
    });

    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    const accepted = await findOperationalHandoffById(ctx, ohRes.handoff.id);

    return (
      accepted.status === 'ACCEPTED' &&
      accepted.assignedDomainReference?.referenceType === 'SERVICE_REQUEST' &&
      accepted.assignedDomainReference?.referenceId === 'sr-e2e-02'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 3: SCENARIO E2E-03 — CUSTOMS SBU ATTACHMENT               */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-03', 'E2E-03 Customs: SO -> FL -> Allocation -> Handoff -> Customs Adapter -> Declaration', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 15000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'CUSTOMS', allocatedQuantity: 1 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'CUSTOMS',
      requestPayload: { declarationId: 'dec-e2e-03', ajuNumber: '000000-000000-20260828-000099' },
    });

    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    const accepted = await findOperationalHandoffById(ctx, ohRes.handoff.id);

    return (
      accepted.status === 'ACCEPTED' &&
      accepted.assignedDomainReference?.referenceType === 'DECLARATION' &&
      accepted.assignedDomainReference?.referenceId === 'dec-e2e-03'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 4: SCENARIO E2E-04 — WAREHOUSE SBU ORDER                  */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-04', 'E2E-04 Warehouse: SO -> FL -> Allocation -> Handoff -> Warehouse Adapter -> WMS SR', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 40000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'WAREHOUSE', allocatedQuantity: 200 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const ohRes = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'WAREHOUSE',
      requestPayload: { serviceRequestId: 'wh-sr-e2e-04', requestNumber: 'WH-SR-2026-08-0104' },
    });

    await performOperationalHandoffAction(ctx, ohRes.handoff.id, { action: 'accept' });
    const accepted = await findOperationalHandoffById(ctx, ohRes.handoff.id);

    return (
      accepted.status === 'ACCEPTED' &&
      accepted.assignedDomainReference?.referenceType === 'WAREHOUSE_ORDER' &&
      accepted.assignedDomainReference?.referenceId === 'wh-sr-e2e-04'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 5: SCENARIO E2E-05 — MULTI-SBU SINGLE SALES ORDER         */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-05', 'E2E-05 Multi-SBU: 1 SO -> 1 Fulfillment -> 4 Allocations -> 4 Domain Handoffs', async () => {
    const ctx = makeContext();
    // 1 Commercial Sales Order
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 200000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    // 1 Multi-SBU Fulfillment Plan
    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 10 },
          { capabilityType: 'CUSTOMS', allocatedQuantity: 1 },
          { capabilityType: 'TRUCKING', allocatedQuantity: 5 },
          { capabilityType: 'WAREHOUSE', allocatedQuantity: 50 },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const compInitial = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const [allocFwd, allocCus, allocTrk, allocWh] = compInitial.allocations;

    // 4 SBU Handoffs
    const ohFwd = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocFwd.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-multi-01' },
    });
    const ohCus = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocCus.id,
      targetDomain: 'CUSTOMS',
      requestPayload: { declarationId: 'dec-multi-01' },
    });
    const ohTrk = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocTrk.id,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-multi-01' },
    });
    const ohWh = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocWh.id,
      targetDomain: 'WAREHOUSE',
      requestPayload: { serviceRequestId: 'wh-multi-01' },
    });

    // Accept all 4 handoffs
    await performOperationalHandoffAction(ctx, ohFwd.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohCus.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohWh.handoff.id, { action: 'accept' });

    // Fulfill all 4 handoffs
    await performOperationalHandoffAction(ctx, ohFwd.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohFwd.handoff.id, { action: 'fulfill', deliveredQuantity: 10 });

    await performOperationalHandoffAction(ctx, ohCus.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohCus.handoff.id, { action: 'fulfill', deliveredQuantity: 1 });

    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'fulfill', deliveredQuantity: 5 });

    await performOperationalHandoffAction(ctx, ohWh.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohWh.handoff.id, { action: 'fulfill', deliveredQuantity: 50 });

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const allDelivered = comp.allocations.every((a) => a.deliveredQuantity === a.allocatedQuantity);

    return allDelivered && comp.allocations.length === 4;
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 6: SCENARIO E2E-06 — PARTIAL FULFILLMENT PROGRESS         */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-06', 'E2E-06 Partial Fulfillment: Multiple handoff deliveries preserve commercial terms', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 100000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 100 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];

    // Delivery 1 (40)
    const oh1 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-part-01' },
    });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh1.handoff.id, { action: 'fulfill', deliveredQuantity: 40 });
    let a1 = mockDb.allocations.find((a) => a.id === alloc.id);

    // Delivery 2 (total 70)
    const oh2 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-part-02' },
    });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh2.handoff.id, { action: 'fulfill', deliveredQuantity: 70 });
    let a2 = mockDb.allocations.find((a) => a.id === alloc.id);

    // Delivery 3 (total 100)
    const oh3 = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-part-03' },
    });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh3.handoff.id, { action: 'fulfill', deliveredQuantity: 100 });
    let a3 = mockDb.allocations.find((a) => a.id === alloc.id);

    const so = await findSalesOrderById(ctx, soRes.salesOrder.id);

    return (
      a1?.delivered_quantity === 40 &&
      a2?.delivered_quantity === 70 &&
      a3?.delivered_quantity === 100 &&
      so.status === 'CONFIRMED' &&
      so.totalAgreedRevenue === 100000000
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 7: SCENARIO E2E-07 — SPLIT SHIPMENT                       */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-07', 'E2E-07 Split Shipment: One Fulfillment plan holding multiple allocations mapped to distinct shipments', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 180000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 50, shipmentId: 'shp-split-01' },
          { capabilityType: 'FORWARDING', allocatedQuantity: 50, shipmentId: 'shp-split-02' },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const [allocA, allocB] = comp.allocations;

    const ohA = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocA.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-split-01' },
    });
    const ohB = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: allocB.id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-split-02' },
    });

    await performOperationalHandoffAction(ctx, ohA.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohB.handoff.id, { action: 'accept' });

    const refA = (await findOperationalHandoffById(ctx, ohA.handoff.id)).assignedDomainReference;
    const refB = (await findOperationalHandoffById(ctx, ohB.handoff.id)).assignedDomainReference;

    return refA?.referenceId === 'shp-split-01' && refB?.referenceId === 'shp-split-02';
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 8: SCENARIO E2E-08 — REPLANNING & HISTORICAL IMMUTABILITY  */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-08', 'E2E-08 Replanning: Historical revision immutable, replan != SO amendment', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 90000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    // Plan Revision 1
    const flRes1 = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
      },
      ctx,
    );
    await performFulfillmentAction(flRes1.fulfillment.id, { action: 'cancel' }, ctx);

    // Replan Revision 2
    const flRes2 = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
      },
      ctx,
    );

    const rev1 = await findFulfillmentById(flRes1.fulfillment.id, ctx);
    const rev2 = await findFulfillmentById(flRes2.fulfillment.id, ctx);
    const so = await findSalesOrderById(ctx, soRes.salesOrder.id);

    return (
      rev1.status === 'CANCELLED' &&
      rev1.revisionNo === 1 &&
      rev2.status === 'PLANNED' &&
      rev2.revisionNo === 2 &&
      so.status === 'CONFIRMED'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 9: SCENARIO E2E-09 — RETRY & IDEMPOTENCY                   */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-09', 'E2E-09 Retry & Idempotency: Duplicate command with idempotency key returns created: false', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 30000000,
        idempotencyKey: 'idemp-so-retry-01',
      },
      ctx,
    );
    const soRetry = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 30000000,
        idempotencyKey: 'idemp-so-retry-01',
      },
      ctx,
    );

    return soRes.created && !soRetry.created && soRes.salesOrder.id === soRetry.salesOrder.id;
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 10: SCENARIO E2E-10 — SECURITY & NUMBER AUTHORITY          */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-10', 'E2E-10 Security & Number Authority: IdentityContext isolation & Server sequence formats', async () => {
    const ctxA = makeContext(TENANT_A);
    const ctxB = makeContext(TENANT_B);

    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 60000000,
      },
      ctxA,
    );

    let crossTenantBlocked = false;
    try {
      await findSalesOrderById(ctxB, soRes.salesOrder.id);
    } catch {
      crossTenantBlocked = true;
    }

    const validNumberFormat =
      soRes.salesOrder.soNumber.startsWith('SO-') &&
      !soRes.salesOrder.soNumber.includes('undefined');

    return crossTenantBlocked && validNumberFormat;
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 11: STATE MACHINE CROSS-DOMAIN INTEGRITY                   */
  /* ------------------------------------------------------------------ */

  await checkAsync('U21-E2E-11', 'E2E-11 State Machine: Illegal lifecycle transitions are blocked deterministically', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder(
      {
        engagementId,
        totalAgreedRevenue: 10000000,
      },
      ctx,
    );
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [{ capabilityType: 'TRUCKING', allocatedQuantity: 1 }],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);
    const alloc = comp.allocations[0];
    const oh = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: alloc.id,
      targetDomain: 'TRUCKING',
    });

    let illegalTransitionBlocked = false;
    try {
      // Direct ISSUED -> FULFILLED is illegal
      await performOperationalHandoffAction(ctx, oh.handoff.id, { action: 'fulfill' });
    } catch (err: any) {
      illegalTransitionBlocked = err instanceof OperationalHandoffError && err.code === 'INVALID_STATUS_TRANSITION';
    }

    return illegalTransitionBlocked;
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION 12: ANTI-PATTERN CONTROLS (POSITIVE & NEGATIVE)           */
  /* ------------------------------------------------------------------ */

  // Positive controls
  check('U21-PC1', 'Positive Control 1: All 4 adapters instantiated cleanly',
    getOperationalHandoffAdapter('FORWARDING') instanceof ForwardingHandoffAdapter &&
    getOperationalHandoffAdapter('CUSTOMS') instanceof CustomsHandoffAdapter &&
    getOperationalHandoffAdapter('TRUCKING') instanceof TruckingHandoffAdapter &&
    getOperationalHandoffAdapter('WAREHOUSE') instanceof WarehouseHandoffAdapter);

  check('U21-PC2', 'Positive Control 2: Canonical sequence RPCs defined for SO, FL, OH',
    allSql.includes('next_sales_order') &&
    allSql.includes('next_fulfillment_number') &&
    allSql.includes('next_operational_handoff_number'));

  // Negative controls
  const noDirectSoToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(salesOrderServiceSrc);
  const noDirectFlToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc);
  const noDirectOhToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);

  check('U21-NC1', 'Negative Control 1: Zero direct SO -> JO mutations', noDirectSoToJo);
  check('U21-NC2', 'Negative Control 2: Zero direct Fulfillment -> JO mutations', noDirectFlToJo);
  check('U21-NC3', 'Negative Control 3: Zero direct Operational Handoff -> JO mutations', noDirectOhToJo);

  const noDriverInHandoff = !/\b(md_drivers|driver_profiles)\b/i.test(handoffServiceSrc);
  const noGpsInHandoff = !/\b(gps_telemetry|telemetry_sessions)\b/i.test(handoffServiceSrc);
  const noWhInventoryInHandoff = !/\.from\(['"]wh_inventory['"]\)/i.test(handoffServiceSrc);

  check('U21-NC4', 'Negative Control 4: Zero direct driver assignments in Handoff', noDriverInHandoff);
  check('U21-NC5', 'Negative Control 5: Zero direct GPS mutations in Handoff', noGpsInHandoff);
  check('U21-NC6', 'Negative Control 6: Zero direct warehouse inventory mutations in Handoff', noWhInventoryInHandoff);

  const noClientOhGenerator = !/function\s+generate(?:Handoff|OH)Number/i.test(handoffServiceSrc);
  const noClientTenantOverride = !/req\.headers\[['"]x-tenant-id['"]\]/i.test(handoffServiceSrc);
  const noSecondEngine = !/\b(createJobOrder|dispatchArmada|assignDriver|putawayInventory)\b/i.test(handoffServiceSrc);

  check('U21-NC7', 'Negative Control 7: Zero client-side OH number generators', noClientOhGenerator);
  check('U21-NC8', 'Negative Control 8: Zero client tenant header overrides', noClientTenantOverride);
  check('U21-NC9', 'Negative Control 9: Zero duplicate operational engines in Handoff', noSecondEngine);

  const noFwdInFl = !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge)\b/i.test(
    fs.readFileSync(path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'), 'utf8')
  );
  const noCusInFl = !/\b(total_duty_and_tax|billing_code|ceisa_status)\b/i.test(
    fs.readFileSync(path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'), 'utf8')
  );
  const noDriverInFl = !/\b(md_drivers|driver_id|driver_profiles)\b/i.test(
    fs.readFileSync(path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'), 'utf8')
  );

  check('U21-NC10', 'Negative Control 10: Zero forwarding execution columns on fulfillments table', noFwdInFl);
  check('U21-NC11', 'Negative Control 11: Zero customs statutory fields on fulfillments table', noCusInFl);
  check('U21-NC12', 'Negative Control 12: Zero driver/telemetry fields on fulfillments table', noDriverInFl);

  // Clean up mock
  _setSalesOrderDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`U-21 END-TO-END COMMERCIAL -> FULFILLMENT -> OPERATIONAL LIFECYCLE SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
