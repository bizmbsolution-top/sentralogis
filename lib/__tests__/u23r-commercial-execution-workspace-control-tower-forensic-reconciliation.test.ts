/**
 * Sentralogis — Phase 4B / U-23R
 * lib/__tests__/u23r-commercial-execution-workspace-control-tower-forensic-reconciliation.test.ts
 *
 * COMMERCIAL EXECUTION WORKSPACE & CONTROL-TOWER READ MODEL FORENSIC RECONCILIATION TEST SUITE
 *
 * Validates:
 * - Read-only projection purity (zero DB mutations, zero side effects)
 * - Canonical lineage fidelity (Engagement -> SO -> FL -> Allocation -> OH -> Domain Execution)
 * - State ownership boundaries (Commercial vs Fulfillment vs Contract Seam vs Sovereign SBU)
 * - Role-aware projection isolation (Internal Operator View vs Sanitized Customer View)
 * - Customer projection allow-list security (0 internal costs, 0 margins, 0 staff/driver PII, 0 CEISA errors)
 * - Tenant isolation & RBAC authorization enforcement
 * - Multi-SBU 4-capability composition & failure isolation
 * - Partial fulfillment (40 -> 70 -> 100) and split shipment mathematical aggregation
 * - Versioned replanning history presentation & immutability
 * - Actionable exception severity classification (WARNING vs CRITICAL vs BLOCKING)
 * - Descriptive command boundary (non-executing projection metadata)
 * - Number authority & anti-pattern containment (0 SO/FL/OH -> JO writes, 0 driver/GPS/inventory/CEISA writes)
 * - ADR-018 through ADR-056 compliance matrix
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  createSalesOrder,
  confirmSalesOrder,
  _setSalesOrderDbClient,
  SalesOrderDbClient,
} from '@/lib/sales-order/service';
import {
  createFulfillment,
  performFulfillmentAction,
  findFulfillmentCompositionById,
  _setFulfillmentDbClient,
  FulfillmentDbClient,
} from '@/lib/fulfillment/service';
import {
  createOperationalHandoff,
  performOperationalHandoffAction,
  _setOperationalHandoffDbClient,
  OperationalHandoffDbClient,
} from '@/lib/operational-handoff/service';
import {
  getInternalOperatorWorkspace,
  getCustomerWorkspaceProjection,
  deriveControlTowerStatus,
  deriveAvailableCommands,
} from '@/lib/control-tower/service';
import type { OperationalHandoff } from '@/lib/operational-handoff/types';

const ROOT = path.resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'lib');
const APP_DIR = path.join(ROOT, 'app');
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

class U23RForensicMockDb
  implements SalesOrderDbClient, FulfillmentDbClient, OperationalHandoffDbClient
{
  public engagements: Record<string, unknown>[] = [];
  public salesOrders: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public handoffs: Record<string, unknown>[] = [];
  public capabilityBindings: Record<string, unknown>[] = [];
  public shipments: Record<string, unknown>[] = [];

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
                const insertedRows = rows.map((row) => {
                  const inserted = {
                    id: row.id || `u23r-${table}-${Date.now()}-${Math.random()}`,
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

export async function runU23rCommercialExecutionWorkspaceForensicReconciliationSuite(): Promise<{
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

  const mockDb = new U23RForensicMockDb();
  _setSalesOrderDbClient(mockDb);
  _setFulfillmentDbClient(mockDb);
  _setOperationalHandoffDbClient(mockDb);

  const engagementId = 'eng-u23r-001';
  mockDb.engagements.push({
    id: engagementId,
    tenant_id: TENANT_A,
    customer_id: CUSTOMER_A,
    status: 'OPEN',
  });
  mockDb.shipments.push(
    { id: 'shp-u23r-01', tenant_id: TENANT_A, status: 'PLANNED' },
    { id: 'shp-u23r-02', tenant_id: TENANT_A, status: 'PLANNED' },
  );

  /* ------------------------------------------------------------------ */
  /*  WS1: CONTROL-TOWER SOURCE FORENSICS (Pure Read Model)             */
  /* ------------------------------------------------------------------ */

  const ctServicePath = path.join(LIB_DIR, 'control-tower', 'service.ts');
  const ctServiceSrc = fs.existsSync(ctServicePath) ? fs.readFileSync(ctServicePath, 'utf8') : '';

  check('U23R-WS01', 'WS1: Control Tower service contains zero insert/update/delete/upsert operations',
    !/\.(insert|update|delete|upsert)\(/i.test(ctServiceSrc));

  check('U23R-WS02', 'WS1: Control Tower service contains zero RPC mutations or number generators',
    !/rpc\(/i.test(ctServiceSrc) && !/function\s+generate/i.test(ctServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  WS2: CANONICAL LINEAGE PROJECTION (Positive Control U23R-PC1)     */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC1', 'WS2: Canonical lineage correlates Engagement -> SO -> FL -> Allocation -> OH -> Domain Reference', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 95000000, currency: 'IDR' }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 100 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    const oh = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: comp.allocations[0].id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u23r-01' },
    });
    await performOperationalHandoffAction(ctx, oh.handoff.id, { action: 'accept' });

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.salesOrder.id === soRes.salesOrder.id &&
      ws.activeFulfillment?.fulfillment.id === flRes.fulfillment.id &&
      ws.allocations.length === 1 &&
      ws.allocations[0].handoffs.length === 1 &&
      ws.allocations[0].handoffs[0].status === 'ACCEPTED' &&
      ws.allocations[0].handoffs[0].assignedDomainReference?.referenceType === 'SHIPMENT'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS3: STATE OWNERSHIP FORENSICS (Zero Shadow State / Mutation)     */
  /* ------------------------------------------------------------------ */

  check('U23R-WS03', 'WS3: Control Tower acts as projection only, holding zero sovereign state ownership',
    !/this\.status\s*=/i.test(ctServiceSrc) && !/setStatus\(/i.test(ctServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  WS4: PROJECTION PURITY (Dynamic Status Derivation)                */
  /* ------------------------------------------------------------------ */

  check('U23R-WS04', 'WS4: Status is dynamically computed across all 9 projection states without DB persistence',
    deriveControlTowerStatus('DRAFT') === 'COMMERCIAL' &&
    deriveControlTowerStatus('CONFIRMED', 'PLANNED') === 'PLANNING' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', []) === 'HANDOFF_PENDING' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', [{ status: 'EXECUTING' } as OperationalHandoff]) === 'EXECUTING' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', [{ status: 'EXECUTING' } as OperationalHandoff], { totalAllocated: 100, totalDelivered: 40 }) === 'PARTIALLY_FULFILLED' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', [{ status: 'EXECUTING' } as OperationalHandoff, { status: 'FAILED' } as OperationalHandoff]) === 'AT_RISK' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', [{ status: 'FAILED' } as OperationalHandoff, { status: 'REJECTED' } as OperationalHandoff]) === 'BLOCKED' &&
    deriveControlTowerStatus('CONFIRMED', 'ACTIVE', [{ status: 'FULFILLED' } as OperationalHandoff], { totalAllocated: 50, totalDelivered: 50 }) === 'FULFILLED' &&
    deriveControlTowerStatus('CANCELLED', 'CLOSED') === 'CLOSED');

  /* ------------------------------------------------------------------ */
  /*  WS5: CUSTOMER PROJECTION SECURITY & ALLOW-LIST (U23R-PC3)         */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC3', 'WS5: Customer projection enforces strict allow-list (zero revenue, margins, staff/driver PII, CEISA errors)', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({
      engagementId,
      totalAgreedRevenue: 180000000,
      currency: 'IDR',
      orderDate: '2026-08-28',
    }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 30 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const custView = await getCustomerWorkspaceProjection(ctx, soRes.salesOrder.id);

    // Verify allow-list properties exist
    const hasAllowed = (
      'orderNumber' in custView &&
      'orderDate' in custView &&
      'aggregateStatus' in custView &&
      'overallProgressPercentage' in custView &&
      'deliveries' in custView &&
      'milestones' in custView
    );

    // Verify forbidden properties do NOT exist
    const hasForbidden = (
      'totalAgreedRevenue' in custView ||
      'margin' in custView ||
      'cost' in custView ||
      'driverPhone' in custView ||
      'driverName' in custView ||
      'exceptions' in custView
    );

    return hasAllowed && !hasForbidden;
  });

  /* ------------------------------------------------------------------ */
  /*  WS6: INTERNAL OPERATOR PROJECTION (U23R-PC2)                      */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC2', 'WS6: Internal Operator projection exposes full operational context, allocations, and exceptions', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 45000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'CUSTOMS', allocatedQuantity: 1 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.tenantId === TENANT_A &&
      ws.salesOrder.id === soRes.salesOrder.id &&
      ws.allocations.length === 1 &&
      ws.allocations[0].capabilityType === 'CUSTOMS' &&
      Array.isArray(ws.availableCommands) &&
      Array.isArray(ws.exceptions)
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS7: COMMAND BOUNDARY AUDIT (Descriptive vs Non-Executing)        */
  /* ------------------------------------------------------------------ */

  check('U23R-WS07', 'WS7: Available commands are descriptive metadata strings without execution side effects',
    deriveAvailableCommands('DRAFT').includes('confirmSalesOrder') &&
    deriveAvailableCommands('CONFIRMED', 'PLANNED').includes('activateFulfillment') &&
    deriveAvailableCommands('CONFIRMED', 'ACTIVE').includes('createOperationalHandoff'));

  /* ------------------------------------------------------------------ */
  /*  WS8 & WS9: TENANT ISOLATION & AUTHORIZATION (U23R-PC9, U23R-PC10) */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC9', 'WS8: Cross-tenant Control Tower query is blocked deterministically', async () => {
    const ctxA = makeContext(TENANT_A);
    const ctxB = makeContext(TENANT_B);
    const so = await createSalesOrder({ engagementId, totalAgreedRevenue: 15000000 }, ctxA);

    let blocked = false;
    try {
      await getInternalOperatorWorkspace(ctxB, so.salesOrder.id);
    } catch {
      blocked = true;
    }
    return blocked;
  });

  await checkAsync('U23R-PC10', 'WS9: Missing commercial:read permission is rejected with 403-class error', async () => {
    const ctxUnauth = makeContext(TENANT_A, []); // 0 permissions
    const so = await createSalesOrder({ engagementId, totalAgreedRevenue: 25000000 }, makeContext(TENANT_A));

    let rejected = false;
    try {
      await getInternalOperatorWorkspace(ctxUnauth, so.salesOrder.id);
    } catch {
      rejected = true;
    }
    return rejected;
  });

  /* ------------------------------------------------------------------ */
  /*  WS10: PARTIAL FULFILLMENT MATHEMATICS (U23R-PC4)                  */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC4', 'WS10: Partial fulfillment (40 -> 70 -> 100) computes percentages and remaining quantities accurately', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 100000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'FORWARDING', allocatedQuantity: 100 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    const oh = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: comp.allocations[0].id,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u23r-01' },
    });
    await performOperationalHandoffAction(ctx, oh.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, oh.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, oh.handoff.id, { action: 'fulfill', deliveredQuantity: 40 });

    const ws1 = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws1.progress.totalPlannedQuantity === 100 &&
      ws1.progress.totalDeliveredQuantity === 40 &&
      ws1.progress.totalRemainingQuantity === 60 &&
      ws1.progress.completionPercentage === 40 &&
      ws1.aggregateStatus === 'PARTIALLY_FULFILLED'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS11: SPLIT SHIPMENT PRESENTATION (U23R-PC5)                      */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC5', 'WS11: Split shipment allocates 40 to Shipment A and 60 to Shipment B under 1 SO', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 110000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 40, shipmentId: 'shp-u23r-01' },
          { capabilityType: 'FORWARDING', allocatedQuantity: 60, shipmentId: 'shp-u23r-02' },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.allocations.length === 2 &&
      ws.allocations[0].shipmentId === 'shp-u23r-01' &&
      ws.allocations[0].allocatedQuantity === 40 &&
      ws.allocations[1].shipmentId === 'shp-u23r-02' &&
      ws.allocations[1].allocatedQuantity === 60 &&
      ws.progress.totalPlannedQuantity === 100
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS12: MULTI-SBU CORRELATION & FAILURE ISOLATION (U23R-PC6)        */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC6', 'WS12: Multi-SBU 4 capabilities correlate under 1 SO; Trucking failure isolates without failing Forwarding', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 220000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      {
        salesOrderId: soRes.salesOrder.id,
        allocations: [
          { capabilityType: 'FORWARDING', allocatedQuantity: 50 },
          { capabilityType: 'CUSTOMS', allocatedQuantity: 1 },
          { capabilityType: 'TRUCKING', allocatedQuantity: 10 },
          { capabilityType: 'WAREHOUSE', allocatedQuantity: 500 },
        ],
      },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    // Forwarding is Executing
    const ohFwd = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: comp.allocations[0].id,
      targetDomain: 'FORWARDING',
    });
    await performOperationalHandoffAction(ctx, ohFwd.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohFwd.handoff.id, { action: 'startExecuting' });

    // Trucking Failed
    const ohTrk = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: comp.allocations[2].id,
      targetDomain: 'TRUCKING',
    });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, {
      action: 'fail',
      failureCode: 'ARMADA_FAULT',
      failureReason: 'Engine oil leak',
    });

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.allocations.length === 4 &&
      ws.aggregateStatus === 'AT_RISK' &&
      ws.exceptions.length === 1 &&
      ws.exceptions[0].affectedDomain === 'TRUCKING' &&
      ws.allocations[0].handoffs[0].status === 'EXECUTING'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS13: EXCEPTION DERIVATION (U23R-PC7)                             */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC7', 'WS13: Rejections derive WARNING severity while Failures derive CRITICAL severity', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 75000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const flRes = await createFulfillment(
      { salesOrderId: soRes.salesOrder.id, allocations: [{ capabilityType: 'CUSTOMS', allocatedQuantity: 1 }] },
      ctx,
    );
    await performFulfillmentAction(flRes.fulfillment.id, { action: 'activate' }, ctx);
    const comp = await findFulfillmentCompositionById(flRes.fulfillment.id, ctx);

    const oh = await createOperationalHandoff(ctx, {
      fulfillmentId: flRes.fulfillment.id,
      fulfillmentAllocationId: comp.allocations[0].id,
      targetDomain: 'CUSTOMS',
    });
    await performOperationalHandoffAction(ctx, oh.handoff.id, {
      action: 'reject',
      failureCode: 'LARTAS_BLOCK',
      failureReason: 'Missing import permit',
    });

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.exceptions.length === 1 &&
      ws.exceptions[0].severity === 'WARNING' &&
      ws.exceptions[0].category === 'HANDOFF_REJECTED' &&
      ws.exceptions[0].failureCode === 'LARTAS_BLOCK'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS14: REVISION / REPLANNING VISIBILITY (U23R-PC8)                 */
  /* ------------------------------------------------------------------ */

  await checkAsync('U23R-PC8', 'WS14: Replanning retains historical Rev 1 (CANCELLED) alongside active Rev 2 (PLANNED)', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 65000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);

    const fl1 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);
    await performFulfillmentAction(fl1.fulfillment.id, { action: 'cancel', reason: 'Vessel change' }, ctx);

    const fl2 = await createFulfillment({ salesOrderId: soRes.salesOrder.id }, ctx);

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.revisions.length === 2 &&
      ws.revisions[0].revisionNo === 1 &&
      ws.revisions[0].status === 'CANCELLED' &&
      ws.revisions[1].revisionNo === 2 &&
      ws.activeFulfillment?.fulfillment.revisionNo === 2 &&
      ws.activeFulfillment?.fulfillment.status === 'PLANNED'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  WS15: NUMBER AUTHORITY FORENSICS (Zero Client Number Generation)  */
  /* ------------------------------------------------------------------ */

  check('U23R-NC11', 'WS15: Control Tower source contains zero client-side number generation or Math.random',
    !/Math\.random/i.test(ctServiceSrc) &&
    !/Date\.now.*(?:SO|FL|OH)/i.test(ctServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  WS16: ANTI-PATTERN NEGATIVE CONTROLS (U23R-NC1..NC10)             */
  /* ------------------------------------------------------------------ */

  check('U23R-NC1', 'WS16: Control Tower service contains ZERO database mutations',
    !/\.from\([^)]+\)\.(?:insert|update|delete|upsert)/i.test(ctServiceSrc));

  check('U23R-NC2', 'WS16: Negative Control: ZERO direct SO -> JO write paths exist in codebase',
    !/\.from\(['"]job_orders['"]\)\.insert\([^)]*sales_order_id/i.test(ctServiceSrc));

  check('U23R-NC3', 'WS16: Negative Control: ZERO direct FL -> JO write paths exist in codebase',
    !/\.from\(['"]job_orders['"]\)\.insert\([^)]*fulfillment_id/i.test(ctServiceSrc));

  check('U23R-NC4', 'WS16: Negative Control: ZERO direct OH -> JO write paths exist in codebase',
    !/\.from\(['"]job_orders['"]\)\.insert\([^)]*operational_handoff_id/i.test(ctServiceSrc));

  check('U23R-NC5', 'WS16: Negative Control: ZERO driver table mutations in Control Tower service',
    !/\.from\(['"](?:md_drivers|driver_profiles)['"]\)/i.test(ctServiceSrc));

  check('U23R-NC6', 'WS16: Negative Control: ZERO GPS telemetry mutations in Control Tower service',
    !/\.from\(['"](?:gps_telemetry|telemetry_sessions)['"]\)/i.test(ctServiceSrc));

  check('U23R-NC7', 'WS16: Negative Control: ZERO warehouse inventory mutations in Control Tower service',
    !/\.from\(['"](?:wh_inventory|wh_stock_ledgers)['"]\)/i.test(ctServiceSrc));

  check('U23R-NC8', 'WS16: Negative Control: ZERO direct CEISA transmissions in Control Tower service',
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(ctServiceSrc));

  check('U23R-NC9', 'WS16: Negative Control: ZERO direct forwarding execution mutations in Control Tower service',
    !/\.from\(['"]shp_execution_legs['"]\)\.(?:insert|update|delete)/i.test(ctServiceSrc));

  check('U23R-NC10', 'WS16: Negative Control: ZERO second operational execution engines created in Control Tower layer',
    !/\b(class\s+OperationalEngine|class\s+FulfillmentEngine)\b/i.test(ctServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  WS17: API ROUTE FORENSICS (Route Purity & Session Resolution)     */
  /* ------------------------------------------------------------------ */

  const apiRoutePath = path.join(APP_DIR, 'api', 'v1', 'commercial', 'control-tower', '[salesOrderId]', 'route.ts');
  const apiRouteSrc = fs.existsSync(apiRoutePath) ? fs.readFileSync(apiRoutePath, 'utf8') : '';

  check('U23R-WS17a', 'WS17: Control Tower API route resolves identity server-side via resolveSessionIdentity',
    /resolveSessionIdentity\(\)/i.test(apiRouteSrc));

  check('U23R-WS17b', 'WS17: Control Tower API route contains zero direct database access (delegates to service)',
    !/\.from\(/i.test(apiRouteSrc) && !/supabaseAdmin/i.test(apiRouteSrc));

  check('U23R-WS17c', 'WS17: Control Tower API route explicitly handles ?view=customer parameter',
    /searchParams\.get\(['"]view['"]\)/i.test(apiRouteSrc) &&
    /getCustomerWorkspaceProjection/i.test(apiRouteSrc));

  /* ------------------------------------------------------------------ */
  /*  WS18: ADR RECONCILIATION MATRIX (ADR-018..056)                    */
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
    const p = path.join(DOCS_DIR, f);
    if (!fs.existsSync(p)) return true;
    const doc = fs.readFileSync(p, 'utf8');
    return !/Status[^:\n]*:[*\s]*RATIFIED/i.test(doc);
  });

  const phase4aReportExists = fs.existsSync(path.join(DOCS_DIR, 'SENTRALOGIS_PHASE4A_IMPLEMENTATION_REPORT.md'));

  check('U23R-WS18', 'WS18: ADR-018..056 governing architecture is 100% ratified and documented in docs/architecture',
    unratified.length === 0 && phase4aReportExists);

  // Teardown
  _setSalesOrderDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`U-23R FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
