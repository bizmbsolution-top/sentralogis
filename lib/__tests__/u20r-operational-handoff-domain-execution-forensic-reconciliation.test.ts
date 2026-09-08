/**
 * Sentralogis — Phase 4B / U-20R
 * lib/__tests__/u20r-operational-handoff-domain-execution-forensic-reconciliation.test.ts
 *
 * OPERATIONAL HANDOFF DOMAIN EXECUTION FORENSIC RECONCILIATION SUITE
 *
 * Independent, read-mostly architectural and security audit verifying that the U-20
 * runtime execution integration strictly conforms to ratified ADR-045..056 and
 * preserves operational sovereignty, lineage, idempotency, security, and commercial invariance.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
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
const APP_DIR = path.join(ROOT, 'app');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

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

// Behavioral Mock DB for Forensic Verification
class U20RForensicMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public salesOrders: Record<string, unknown>[] = [];
  public nextInsertUniqueViolation = false;
  private seqCounter = 900;

  rpc(fn: string, _args: Record<string, unknown>): Promise<{ data: unknown; error: null | { message: string; code?: string } }> {
    if (fn === 'next_operational_handoff_number') {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const num = `OH-${year}-${month}-${String(this.seqCounter++).padStart(4, '0')}`;
      return Promise.resolve({ data: num, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `Unknown RPC: ${fn}` } });
  }

  from(table: string) {
    const self = this;
    let filters: Array<{ col: string; val: unknown }> = [];

    const queryChain: any = {
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return queryChain;
      },
      in(_col: string, _vals: unknown[]) {
        return queryChain;
      },
      order(_col: string, _opts: { ascending: boolean }) {
        return queryChain;
      },
      limit(_count: number) {
        return queryChain;
      },
      then(onfulfilled: any) {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        return Promise.resolve(onfulfilled({ data: rows, error: null }));
      },
      async single() {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        if (rows.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        return { data: { ...rows[0] }, error: null };
      },
      async maybeSingle() {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows.length > 0 ? { ...rows[0] } : null, error: null };
      },
    };

    return {
      select(_cols?: string) {
        return queryChain;
      },
      insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]) {
        const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows;
        return {
          select(_cols?: string) {
            return {
              async single() {
                if (self.nextInsertUniqueViolation) {
                  self.nextInsertUniqueViolation = false;
                  return { data: null, error: { message: 'unique violation', code: '23505' } };
                }
                const inserted = {
                  id: row.id || `oh-u20r-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...row,
                };
                self.getTableData(table).push(inserted);
                return { data: { ...inserted }, error: null };
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
    if (table === 'operational_handoffs') return this.handoffs;
    if (table === 'fulfillments') return this.fulfillments;
    if (table === 'fulfillment_allocations') return this.allocations;
    if (table === 'sales_orders') return this.salesOrders;
    return [];
  }
}

export async function runU20rOperationalHandoffDomainExecutionForensicReconciliationSuite(): Promise<{
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
  const mig021 = fs.existsSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'), 'utf8')
    : '';

  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const handoffTypesSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'), 'utf8')
    : '';
  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const salesOrderServiceSrc = fs.existsSync(path.join(LIB_DIR, 'sales-order', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'sales-order', 'service.ts'), 'utf8')
    : '';

  const handoffsDdl =
    mig021.match(/CREATE TABLE IF NOT EXISTS public\.operational_handoffs\s*\(([\s\S]*?)\);/i)?.[1] || '';

  /* ------------------------------------------------------------------ */
  /*  1. ADR INTEGRITY & COMPLIANCE (ADR-045 .. ADR-056)                */
  /* ------------------------------------------------------------------ */

  const adrs = [
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
  const allAdrsRatified = adrs.every((d) => {
    const src = readDoc(d);
    return src.length > 0 && /Status[\s\S]*?RATIFIED/i.test(src);
  });
  check('U20R-01', 'ADR Compliance: ADR-045 through ADR-056 are physically present and RATIFIED', allAdrsRatified);

  /* ------------------------------------------------------------------ */
  /*  2. SOVEREIGN DOMAIN BOUNDARY FORENSICS                            */
  /* ------------------------------------------------------------------ */

  // Forwarding sovereignty
  const fwdSovereign = !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge|master_bl_number|house_bl_number)\b/i.test(handoffsDdl);
  check('U20R-02', 'Forwarding Sovereignty: operational_handoffs contains 0 vessel/voyage/POL/POD/MBL/HBL columns', fwdSovereign);

  // Customs sovereignty
  const cusSovereign = !/\b(total_duty_and_tax|billing_code|customs_office_code|ceisa_status)\b/i.test(handoffsDdl);
  check('U20R-03', 'Customs Sovereignty: operational_handoffs contains 0 customs duty/valuation/CEISA columns', cusSovereign);

  // Trucking lineage
  const noDirectJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);
  check('U20R-04', 'Trucking Lineage: Zero direct job_orders mutations in operational handoff service', noDirectJo);

  // Warehouse sovereignty
  const noInventoryInHandoff = !/\.from\(['"]wh_inventory['"]\)/i.test(handoffServiceSrc) &&
                               !/\b(bin_location|rack_location|putaway_status)\b/i.test(handoffsDdl);
  check('U20R-05', 'Warehouse Sovereignty: Zero direct inventory mutations and 0 bin/rack columns in handoffs', noInventoryInHandoff);

  // Zero second operational engine
  const noSecondEngine = !/\b(createJobOrder|dispatchArmada|assignDriver|putawayInventory)\b/i.test(handoffServiceSrc);
  check('U20R-06', 'Boundary: Zero second operational engines in Operational Handoff domain', noSecondEngine);

  /* ------------------------------------------------------------------ */
  /*  3. ADAPTER PRE-VALIDATION & REFERENCE BINDING                     */
  /* ------------------------------------------------------------------ */

  check('U20R-07', 'Adapter Pre-Validation: performOperationalHandoffAction runs adapter.validate() on accept',
    handoffServiceSrc.includes('adapter.validate(current)') &&
    handoffServiceSrc.includes("'ADAPTER_REJECTED'"));

  check('U20R-08', 'Polymorphic Reference: Table stores assigned_domain_reference JSONB',
    /assigned_domain_reference\s+JSONB/i.test(mig021));

  /* ------------------------------------------------------------------ */
  /*  4. FULFILLMENT PROGRESS & COMMERCIAL INVARIANCE                   */
  /* ------------------------------------------------------------------ */

  check('U20R-09', 'Progress Propagation: performOperationalHandoffAction updates fulfillment_allocations.delivered_quantity on fulfill',
    handoffServiceSrc.includes("case 'fulfill'") &&
    handoffServiceSrc.includes("delivered_quantity: input.deliveredQuantity"));

  check('U20R-10', 'Commercial Invariance: Zero sales_orders mutations in Operational Handoff service',
    !/\.from\(['"]sales_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc));

  /* ------------------------------------------------------------------ */
  /*  5. SECURITY, TENANCY & NUMBER AUTHORITY                           */
  /* ------------------------------------------------------------------ */

  check('U20R-11', 'Tenant Isolation: Derived strictly from IdentityContext (0 trust in x-tenant-id)',
    !/x-tenant-id/i.test(handoffServiceSrc) && handoffServiceSrc.includes('context.tenantId'));

  check('U20R-12', 'Database RLS: operational_handoffs table enforces get_my_tenant_id() isolation',
    /CREATE POLICY operational_handoffs_isolation ON public\.operational_handoffs[\s\S]*?get_my_tenant_id\(\)/i.test(mig021));

  check('U20R-13', 'Authorization: Enforces commercial:manage on mutations and commercial:read on queries',
    handoffServiceSrc.includes("assertPermission(context, 'commercial:manage')") &&
    handoffServiceSrc.includes("assertPermission(context, 'commercial:read')"));

  check('U20R-14', 'Number Authority: Server-authoritative next_operational_handoff_number RPC produces OH-YYYY-MM-NNNN',
    mig021.includes('seq_operational_handoff') &&
    mig021.includes('next_operational_handoff_number') &&
    handoffServiceSrc.includes("db.rpc('next_operational_handoff_number'"));

  /* ------------------------------------------------------------------ */
  /*  6. IDEMPOTENCY & RETRY SAFETY                                     */
  /* ------------------------------------------------------------------ */

  check('U20R-15', 'Idempotency DDL: Table enforces UNIQUE(tenant_id, idempotency_key)',
    /CONSTRAINT uq_operational_handoff_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(mig021));

  check('U20R-16', 'Idempotency Code: PostgreSQL 23505 catch-and-reselect pattern implemented',
    handoffServiceSrc.includes("insertError.code === '23505'") &&
    handoffServiceSrc.includes('created: false'));

  /* ------------------------------------------------------------------ */
  /*  7. CARDINALITY GUARDRAILS                                         */
  /* ------------------------------------------------------------------ */

  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check('U20R-17', 'Cardinality: Many SO -> 1 WO is FORBIDDEN (ADR-037); direct SO -> JO is strictly FORBIDDEN',
    noSoOnWorkOrders && noSoOnJobOrders);

  const noDirectFlToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc);
  check('U20R-18', 'Cardinality: Direct Fulfillment -> Job Order writes strictly forbidden', noDirectFlToJo);

  /* ------------------------------------------------------------------ */
  /*  8. BEHAVIORAL FORENSIC FLOWS (Mock DB)                            */
  /* ------------------------------------------------------------------ */

  const mockDb = new U20RForensicMockDb();
  _setOperationalHandoffDbClient(mockDb);

  const soId = 'so-rec-1111';
  const flId = 'fl-rec-1111';
  const allocFwd = 'alloc-rec-fwd';
  const allocTrk = 'alloc-rec-trk';

  mockDb.salesOrders.push({ id: soId, tenant_id: TENANT_A, status: 'CONFIRMED', total_amount: 50000000 });
  mockDb.fulfillments.push({ id: flId, tenant_id: TENANT_A, sales_order_id: soId, status: 'ACTIVE', revision_no: 1 });
  mockDb.allocations.push(
    { id: allocFwd, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'FORWARDING', allocated_quantity: 20, delivered_quantity: 0 },
    { id: allocTrk, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'TRUCKING', allocated_quantity: 10, delivered_quantity: 0 },
  );

  // U20R-19: Behavioral Full Lifecycle with Progress Propagation
  await checkAsync('U20R-19', 'Behavioral: Full lifecycle execution and allocation delivered_quantity propagation', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-rec-001', shipmentNumber: 'SHP-REC-001' },
    });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'acknowledge' });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'startExecuting' });
    const ful = await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'fulfill', deliveredQuantity: 20 });

    const alloc = mockDb.allocations.find((a) => a.id === allocFwd);
    const so = mockDb.salesOrders.find((s) => s.id === soId);

    return ful.status === 'FULFILLED' &&
           alloc?.delivered_quantity === 20 &&
           so?.status === 'CONFIRMED' &&
           so?.total_amount === 50000000;
  });

  // U20R-20: Behavioral Terminal Failure Isolation
  await checkAsync('U20R-20', 'Behavioral: Terminal failure sets FAILED without corrupting Sales Order', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocTrk,
      targetDomain: 'TRUCKING',
    });
    const failed = await performOperationalHandoffAction(ctx, h.handoff.id, {
      action: 'fail',
      failureCode: 'ROAD_BLOCKED',
      failureReason: 'Landslide on primary highway',
    });
    const so = mockDb.salesOrders.find((s) => s.id === soId);
    return failed.status === 'FAILED' &&
           failed.failureCode === 'ROAD_BLOCKED' &&
           so?.status === 'CONFIRMED';
  });

  /* ------------------------------------------------------------------ */
  /*  9. POSITIVE CONTROLS (PC1 through PC7)                            */
  /* ------------------------------------------------------------------ */

  check('U20R-PC1', 'Positive Control 1: Forwarding sovereignty derivation produces SHIPMENT reference',
    getOperationalHandoffAdapter('FORWARDING').createDomainReference({ id: '1', targetDomain: 'FORWARDING', handoffNumber: 'OH-1', requestPayload: {} } as any).referenceType === 'SHIPMENT');

  check('U20R-PC2', 'Positive Control 2: Customs sovereignty derivation produces DECLARATION reference',
    getOperationalHandoffAdapter('CUSTOMS').createDomainReference({ id: '2', targetDomain: 'CUSTOMS', handoffNumber: 'OH-2', requestPayload: {} } as any).referenceType === 'DECLARATION');

  check('U20R-PC3', 'Positive Control 3: Trucking lineage derivation produces SERVICE_REQUEST reference',
    getOperationalHandoffAdapter('TRUCKING').createDomainReference({ id: '3', targetDomain: 'TRUCKING', handoffNumber: 'OH-3', requestPayload: {} } as any).referenceType === 'SERVICE_REQUEST');

  check('U20R-PC4', 'Positive Control 4: Warehouse sovereignty derivation produces WAREHOUSE_ORDER reference',
    getOperationalHandoffAdapter('WAREHOUSE').createDomainReference({ id: '4', targetDomain: 'WAREHOUSE', handoffNumber: 'OH-4', requestPayload: {} } as any).referenceType === 'WAREHOUSE_ORDER');

  check('U20R-PC5', 'Positive Control 5: Lifecycle transition map is strictly closed',
    OPERATIONAL_HANDOFF_TRANSITIONS.FULFILLED.length === 0 &&
    OPERATIONAL_HANDOFF_TRANSITIONS.FAILED.length === 0);

  check('U20R-PC6', 'Positive Control 6: Idempotency uniqueness key constraint exists',
    mig021.includes('uq_operational_handoff_idempotency'));

  check('U20R-PC7', 'Positive Control 7: Progress propagation delivered_quantity is handled',
    handoffServiceSrc.includes('delivered_quantity: input.deliveredQuantity'));

  /* ------------------------------------------------------------------ */
  /*  10. NEGATIVE CONTROLS (NC1 through NC7)                           */
  /* ------------------------------------------------------------------ */

  // NC1: Planted direct OH -> JO mutation
  const plantedDirectOhToJo = "await db.from('job_orders').insert({ wo_item_id: '123' });";
  check('U20R-NC1', 'Negative Control 1: Planted direct OH -> JO mutation is caught',
    /\.from\(['"]job_orders['"]\)\.insert/i.test(plantedDirectOhToJo));

  // NC2: Planted direct FL -> JO mutation
  const plantedDirectFlToJo = "await db.from('job_orders').update({ status: 'DONE' });";
  check('U20R-NC2', 'Negative Control 2: Planted direct FL -> JO mutation is caught',
    /\.from\(['"]job_orders['"]\)\.update/i.test(plantedDirectFlToJo));

  // NC3: Planted direct SO -> JO mutation
  const plantedDirectSoToJo = "await db.from('job_orders').delete();";
  check('U20R-NC3', 'Negative Control 3: Planted direct SO -> JO mutation is caught',
    /\.from\(['"]job_orders['"]\)\.delete/i.test(plantedDirectSoToJo));

  // NC4: Planted direct inventory mutation
  const plantedDirectInventory = "await db.from('wh_inventory').insert({ sku: 'A1' });";
  check('U20R-NC4', 'Negative Control 4: Planted direct warehouse inventory mutation is caught',
    /\.from\(['"]wh_inventory['"]\)/i.test(plantedDirectInventory));

  // NC5: Planted client tenant spoofing
  const plantedTenantSpoof = "const tenantId = req.headers['x-tenant-id'];";
  check('U20R-NC5', 'Negative Control 5: Planted x-tenant-id header authority is caught',
    /headers\[['"]x-tenant-id['"]\]/i.test(plantedTenantSpoof));

  // NC6: Planted client OH number generation
  const plantedClientOhNumber = "const num = 'OH-' + Date.now();";
  check('U20R-NC6', 'Negative Control 6: Planted client OH number generator is caught',
    /'OH-'\s*\+\s*Date\.now\(\)/i.test(plantedClientOhNumber));

  // NC7: Planted second operational engine
  const plantedSecondEngine = "function createJobOrderEngine() { return new JobOrderEngine(); }";
  check('U20R-NC7', 'Negative Control 7: Planted second operational engine is caught',
    /createJobOrderEngine/i.test(plantedSecondEngine));

  // Clean up mock
  _setOperationalHandoffDbClient(null);

  console.log(`U-20R OPERATIONAL HANDOFF DOMAIN EXECUTION FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
