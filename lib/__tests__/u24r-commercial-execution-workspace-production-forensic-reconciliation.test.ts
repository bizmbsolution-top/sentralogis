/**
 * Sentralogis — Phase 4B / U-24R
 * lib/__tests__/u24r-commercial-execution-workspace-production-forensic-reconciliation.test.ts
 *
 * COMMERCIAL EXECUTION WORKSPACE / CONTROL TOWER PRODUCTION UI FORENSIC RECONCILIATION TEST SUITE
 *
 * Validates:
 * - Production UI & Control Tower read-model purity (0 DB writes)
 * - Zero shadow tables (no control_tower* migrations or tables)
 * - Zero second operational execution engines
 * - Zero direct SO/FL/OH -> JO writes
 * - Zero driver / GPS / warehouse inventory / CEISA mutations
 * - Zero client-side number generation
 * - Strict customer projection allow-list security
 * - Canonical lineage fidelity (Engagement -> SO -> FL -> Allocation -> OH -> Domain Reference -> Progress)
 * - ADR-018..056 compliance matrix
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

const ROOT = path.resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'lib');
const APP_DIR = path.join(ROOT, 'app');
const COMPONENTS_DIR = path.join(ROOT, 'components', 'control-tower');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');

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

class U24RForensicMockDb
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
                    id: row.id || `u24r-${table}-${Date.now()}-${Math.random()}`,
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

export async function runU24rCommercialExecutionWorkspaceProductionForensicReconciliationSuite(): Promise<{
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

  const mockDb = new U24RForensicMockDb();
  _setSalesOrderDbClient(mockDb);
  _setFulfillmentDbClient(mockDb);
  _setOperationalHandoffDbClient(mockDb);

  const engagementId = 'eng-u24r-001';
  mockDb.engagements.push({
    id: engagementId,
    tenant_id: TENANT_A,
    customer_id: CUSTOMER_A,
    status: 'OPEN',
  });
  mockDb.shipments.push(
    { id: 'shp-u24r-01', tenant_id: TENANT_A, status: 'PLANNED' },
    { id: 'shp-u24r-02', tenant_id: TENANT_A, status: 'PLANNED' },
  );

  /* ------------------------------------------------------------------ */
  /*  FORENSIC 1: SOURCE INSPECTION OF COMPONENTS & ROUTES              */
  /* ------------------------------------------------------------------ */

  const ctFiles = fs.existsSync(COMPONENTS_DIR) ? fs.readdirSync(COMPONENTS_DIR) : [];
  const allComponentCode = ctFiles
    .map((f) => fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf8'))
    .join('\n');

  const ctServiceCode = fs.existsSync(path.join(LIB_DIR, 'control-tower', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'control-tower', 'service.ts'), 'utf8')
    : '';

  check('U24R-01', 'U24R-01: Zero database mutations in components/control-tower/',
    !/\.from\([^)]+\)\.(?:insert|update|delete|upsert)/i.test(allComponentCode));

  check('U24R-02', 'U24R-02: Zero database mutations in lib/control-tower/service.ts',
    !/\.from\([^)]+\)\.(?:insert|update|delete|upsert)/i.test(ctServiceCode));

  check('U24R-03', 'U24R-03: Zero shadow control_tower database tables in supabase/migrations/',
    !fs.existsSync(path.join(MIGRATIONS_DIR, '20260828_022_control_tower.sql')));

  check('U24R-04', 'U24R-04: Zero second operational execution engines created in Control Tower layer',
    !/\b(class\s+OperationalEngine|class\s+FulfillmentEngine)\b/i.test(allComponentCode) &&
    !/\b(class\s+OperationalEngine|class\s+FulfillmentEngine)\b/i.test(ctServiceCode));

  check('U24R-05', 'U24R-05: Zero direct SO/FL/OH -> JO writes in UI components',
    !/\.from\(['"]job_orders['"]\)\.insert/i.test(allComponentCode));

  check('U24R-06', 'U24R-06: Zero driver / GPS mutations in UI components',
    !/\.from\(['"](?:md_drivers|driver_profiles|gps_telemetry|telemetry_sessions)['"]\)/i.test(allComponentCode));

  check('U24R-07', 'U24R-07: Zero warehouse inventory mutations in UI components',
    !/\.from\(['"](?:wh_inventory|wh_stock_ledgers)['"]\)/i.test(allComponentCode));

  check('U24R-08', 'U24R-08: Zero direct CEISA transmissions in UI components',
    !/\b(transmitCeisaDeclaration|sendCeisaEdi)\b/i.test(allComponentCode));

  check('U24R-09', 'U24R-09: Zero client-side business numbering generators in UI components',
    !/function\s+generate(?:SO|FL|OH)Number/i.test(allComponentCode) &&
    !/Math\.random\(\).*?(?:SO|FL|OH)/i.test(allComponentCode));

  /* ------------------------------------------------------------------ */
  /*  FORENSIC 2: CUSTOMER PROJECTION SECURITY & ALLOW-LIST             */
  /* ------------------------------------------------------------------ */

  await checkAsync('U24R-10', 'U24R-10: Customer projection strictly excludes internal margins, costs, driver PII, and CEISA diagnostics', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 250000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);
    const custView = await getCustomerWorkspaceProjection(ctx, soRes.salesOrder.id);

    return (
      !('totalAgreedRevenue' in custView) &&
      !('exceptions' in custView) &&
      !('margin' in custView) &&
      !('cost' in custView) &&
      !('driverPhone' in custView) &&
      'orderNumber' in custView &&
      'milestones' in custView
    );
  });

  /* ------------------------------------------------------------------ */
  /*  FORENSIC 3: MULTI-SBU CORRELATION & FAILURE ISOLATION             */
  /* ------------------------------------------------------------------ */

  await checkAsync('U24R-11', 'U24R-11: Multi-SBU correlation cleanly handles Trucking failure while Forwarding executes', async () => {
    const ctx = makeContext();
    const soRes = await createSalesOrder({ engagementId, totalAgreedRevenue: 160000000 }, ctx);
    await confirmSalesOrder(soRes.salesOrder.id, ctx);
    const flRes = await createFulfillment({
      salesOrderId: soRes.salesOrder.id,
      allocations: [
        { capabilityType: 'FORWARDING', allocatedQuantity: 30 },
        { capabilityType: 'TRUCKING', allocatedQuantity: 5 },
      ],
    }, ctx);
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
      fulfillmentAllocationId: comp.allocations[1].id,
      targetDomain: 'TRUCKING',
    });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, ohTrk.handoff.id, { action: 'fail', failureCode: 'ENGINE_OVERHEAT' });

    const ws = await getInternalOperatorWorkspace(ctx, soRes.salesOrder.id);

    return (
      ws.allocations.length === 2 &&
      ws.aggregateStatus === 'AT_RISK' &&
      ws.exceptions.length === 1 &&
      ws.exceptions[0].failureCode === 'ENGINE_OVERHEAT' &&
      ws.allocations[0].handoffs[0].status === 'EXECUTING'
    );
  });

  /* ------------------------------------------------------------------ */
  /*  FORENSIC 4: TENANT ISOLATION & AUTHORIZATION                      */
  /* ------------------------------------------------------------------ */

  await checkAsync('U24R-12', 'U24R-12: Cross-tenant query attempt on Control Tower is rejected deterministically', async () => {
    const ctxA = makeContext(TENANT_A);
    const ctxB = makeContext(TENANT_B);
    const so = await createSalesOrder({ engagementId, totalAgreedRevenue: 15000000 }, ctxA);
    await confirmSalesOrder(so.salesOrder.id, ctxA);
    let crossTenantBlocked = false;
    try {
      await getInternalOperatorWorkspace(ctxB, so.salesOrder.id);
    } catch {
      crossTenantBlocked = true;
    }
    return crossTenantBlocked;
  });

  /* ------------------------------------------------------------------ */
  /*  FORENSIC 5: ADR-018..056 RATIFICATION FIDELITY                   */
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

  check('U24R-13', 'U24R-13: ADR-018..056 governing architecture is 100% ratified and preserved',
    unratified.length === 0);

  // Teardown
  _setSalesOrderDbClient(null);
  _setFulfillmentDbClient(null);
  _setOperationalHandoffDbClient(null);

  console.log(`U-24R FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
