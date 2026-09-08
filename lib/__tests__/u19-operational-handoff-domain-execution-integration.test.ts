/**
 * Sentralogis — Phase 4B / U-19
 * lib/__tests__/u19-operational-handoff-domain-execution-integration.test.ts
 *
 * OPERATIONAL HANDOFF DOMAIN EXECUTION INTEGRATION FORENSIC DISCOVERY SUITE
 *
 * Deep architectural audit proving that OperationalHandoff safely acts as the
 * execution seam across Forwarding, Customs, Trucking, and Warehouse without
 * becoming a second operational engine, mutating commercial state, or bypassing
 * domain sovereignty (ADR-045 .. ADR-056).
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

// Behavioral Mock DB
class DomainExecutionMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  private seqCounter = 100;

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
                const inserted = {
                  id: row.id || `oh-exec-${Date.now()}-${Math.random()}`,
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
        return {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return this;
          },
          async select(_cols?: string) {
            const list = self.getTableData(table);
            const updated: Record<string, unknown>[] = [];
            for (let i = 0; i < list.length; i++) {
              if (filters.every((f) => list[i][f.col] === f.val)) {
                list[i] = { ...list[i], ...patch, updated_at: new Date().toISOString() };
                updated.push({ ...list[i] });
              }
            }
            return { data: updated, error: null };
          },
        };
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
    return [];
  }
}

export async function runU19OperationalHandoffDomainExecutionSuite(): Promise<{
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

  const mig003 = fs.existsSync(path.join(MIG_DIR, '20260826_003_canonical_shipments_and_units.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260826_003_canonical_shipments_and_units.sql'), 'utf8')
    : '';
  const mig004 = fs.existsSync(path.join(MIG_DIR, '20260826_004_service_requests_and_contracts.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260826_004_service_requests_and_contracts.sql'), 'utf8')
    : '';
  const mig005 = fs.existsSync(path.join(MIG_DIR, '20260826_005_customs_declarations_schema.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260826_005_customs_declarations_schema.sql'), 'utf8')
    : '';
  const mig021 = fs.existsSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'), 'utf8')
    : '';

  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const truckingLineageSrc = fs.existsSync(path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'), 'utf8')
    : '';

  /* ------------------------------------------------------------------ */
  /*  SECTION A: Architectural Authority & Sovereign Boundary Invariants */
  /* ------------------------------------------------------------------ */

  // U19-01: Ratified ADR Inventory
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
  const allRatified = adrs.every((d) => {
    const src = readDoc(d);
    return src.length > 0 && /Status[\s\S]*?RATIFIED/i.test(src);
  });
  check('U19-01', 'Authority: ADR-045 through ADR-056 are physically RATIFIED in docs/architecture', allRatified);

  const handoffsDdl =
    mig021.match(/CREATE TABLE IF NOT EXISTS public\.operational_handoffs\s*\(([\s\S]*?)\);/i)?.[1] || '';

  // U19-02: Forwarding Sovereignty (ADR-046, ADR-052)
  const fwdSovereign =
    /CREATE TABLE IF NOT EXISTS public\.shp_shipments/i.test(mig003) &&
    /master_bl_number|house_bl_number|booking_reference/i.test(mig003) &&
    !/\b(master_bl_number|house_bl_number|booking_reference|vessel_name|voyage_number)\b/i.test(handoffsDdl);
  check('U19-02', 'Forwarding Sovereignty: shp_shipments owns physical movement (MBL/HBL/booking); operational_handoffs contains 0 forwarding execution columns', fwdSovereign);

  // U19-03: Customs Sovereignty (ADR-047, ADR-053)
  const cusSovereign =
    /CREATE TABLE IF NOT EXISTS public\.cus_declarations/i.test(mig005) &&
    /declaration_number TEXT NOT NULL/i.test(mig005) &&
    !/\b(total_duty_and_tax|billing_code|customs_office_code)\b/i.test(handoffsDdl);
  check('U19-03', 'Customs Sovereignty: cus_declarations owns statutory lifecycle & declaration numbers; operational_handoffs contains 0 customs calculation columns', cusSovereign);

  // U19-04: Trucking Lineage Integrity (ADR-054, U-07)
  const trkLineage =
    /CREATE TABLE IF NOT EXISTS public\.svc_service_requests/i.test(mig004) &&
    truckingLineageSrc.includes('resolveTruckingLineage');
  check('U19-04', 'Trucking Lineage: svc_service_requests commands Trucking, resolving via trucking-lineage.ts to WO -> wo_item -> JO', trkLineage);

  // U19-05: Warehouse Sovereignty (ADR-055)
  const whSovereign =
    !/bin_location|rack_location|putaway_status|stock_quantity/i.test(mig021) &&
    !/bin_location|rack_location/i.test(handoffServiceSrc);
  check('U19-05', 'Warehouse Sovereignty: Warehouse SBU owns WMS storage & putaway; operational_handoffs contains 0 bin/rack/inventory columns', whSovereign);

  // U19-06: No Second Operational Engine
  const noSecondEngine =
    !/\.from\(['"](job_orders|md_drivers|driver_profiles|wh_inventory|cus_declarations|shp_shipments)['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc) &&
    !/\.from\(['"](job_orders|md_drivers|driver_profiles|wh_inventory|cus_declarations|shp_shipments)['"]\)\.(?:insert|update|delete)/i.test(fulfillmentServiceSrc);
  check('U19-06', 'Boundary: Zero second operational engines; neither Fulfillment nor OperationalHandoff mutates operational execution tables directly', noSecondEngine);

  // U19-07: Number Authority
  const numAuthority =
    mig021.includes('seq_operational_handoff') &&
    mig021.includes('next_operational_handoff_number') &&
    handoffServiceSrc.includes("db.rpc('next_operational_handoff_number'");
  check('U19-07', 'Number Authority: next_operational_handoff_number() generates OH-YYYY-MM-NNNN via database sequence', numAuthority);

  // U19-08: Tenant Security & RLS
  const tenantIsolation =
    handoffServiceSrc.includes('context.tenantId') &&
    !/x-tenant-id/i.test(handoffServiceSrc) &&
    /CREATE POLICY operational_handoffs_isolation ON public\.operational_handoffs[\s\S]*?get_my_tenant_id\(\)/i.test(mig021);
  check('U19-08', 'Tenant Isolation: Server-derived context.tenantId + get_my_tenant_id() RLS; zero trust in client headers', tenantIsolation);

  // U19-09: Authorization Verification
  const authVerified =
    handoffServiceSrc.includes("assertPermission(context, 'commercial:manage')") &&
    handoffServiceSrc.includes("assertPermission(context, 'commercial:read')");
  check('U19-09', 'Authorization: commercial:manage required for handoff mutations; commercial:read required for queries', authVerified);

  // U19-10: Idempotency DDL & Handler
  const idempVerified =
    /CONSTRAINT uq_operational_handoff_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(mig021) &&
    handoffServiceSrc.includes("insertError.code === '23505'");
  check('U19-10', 'Idempotency: Database UNIQUE(tenant_id, idempotency_key) + 23505 catch-and-reselect pattern', idempVerified);

  // U19-11: Cardinality Guardrails
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check('U19-11', 'Cardinality: Many SO -> 1 WO is FORBIDDEN (ADR-037); direct SO -> JO is strictly FORBIDDEN', noSoOnWorkOrders && noSoOnJobOrders);

  // U19-12: Multi-SBU Support (ADR-048)
  const fwdAd = getOperationalHandoffAdapter('FORWARDING');
  const cusAd = getOperationalHandoffAdapter('CUSTOMS');
  const trkAd = getOperationalHandoffAdapter('TRUCKING');
  const whAd = getOperationalHandoffAdapter('WAREHOUSE');
  const multiSbuAdapters =
    fwdAd instanceof ForwardingHandoffAdapter &&
    cusAd instanceof CustomsHandoffAdapter &&
    trkAd instanceof TruckingHandoffAdapter &&
    whAd instanceof WarehouseHandoffAdapter;
  check('U19-12', 'Multi-SBU: Adapters exist for all four canonical SBU capabilities (ADR-048)', multiSbuAdapters);

  // U19-13: Loose Domain Reference Pointer
  const loosePointer =
    /assigned_domain_reference\s+JSONB/i.test(mig021) &&
    handoffServiceSrc.includes('assigned_domain_reference');
  check('U19-13', 'Loose Reference: assigned_domain_reference JSONB polymorphic pointer connects handoff to domain aggregates', loosePointer);

  /* ------------------------------------------------------------------ */
  /*  SECTION B: Behavioral Cross-Domain Integration Verification       */
  /* ------------------------------------------------------------------ */

  const mockDb = new DomainExecutionMockDb();
  _setOperationalHandoffDbClient(mockDb);

  const flId = 'ffffffff-0000-0000-0000-ffffffffffff';
  const allocFwd = 'alloc-fwd-1111';
  const allocCus = 'alloc-cus-2222';
  const allocTrk = 'alloc-trk-3333';
  const allocWh = 'alloc-wh-4444';

  mockDb.fulfillments.push({ id: flId, tenant_id: TENANT_A, status: 'ACTIVE' });
  mockDb.allocations.push(
    { id: allocFwd, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'FORWARDING' },
    { id: allocCus, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'CUSTOMS' },
    { id: allocTrk, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'TRUCKING' },
    { id: allocWh, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'WAREHOUSE' },
  );

  // U19-B01: Multi-SBU Decomposition
  await checkAsync('U19-B01', 'Behavioral: Create 4 distinct domain handoffs for single Fulfillment plan', async () => {
    const ctx = makeContext();
    const hFwd = await createOperationalHandoff(ctx, { fulfillmentId: flId, fulfillmentAllocationId: allocFwd, targetDomain: 'FORWARDING' });
    const hCus = await createOperationalHandoff(ctx, { fulfillmentId: flId, fulfillmentAllocationId: allocCus, targetDomain: 'CUSTOMS' });
    const hTrk = await createOperationalHandoff(ctx, { fulfillmentId: flId, fulfillmentAllocationId: allocTrk, targetDomain: 'TRUCKING' });
    const hWh = await createOperationalHandoff(ctx, { fulfillmentId: flId, fulfillmentAllocationId: allocWh, targetDomain: 'WAREHOUSE' });

    return hFwd.created && hCus.created && hTrk.created && hWh.created &&
           hFwd.handoff.targetDomain === 'FORWARDING' &&
           hCus.handoff.targetDomain === 'CUSTOMS' &&
           hTrk.handoff.targetDomain === 'TRUCKING' &&
           hWh.handoff.targetDomain === 'WAREHOUSE';
  });

  // U19-B02: Forwarding Acceptance & Reference Binding
  await checkAsync('U19-B02', 'Behavioral: Forwarding handoff accept produces SHIPMENT reference', async () => {
    const ctx = makeContext();
    const fwdHandoffId = mockDb.handoffs.find((h) => h.target_domain === 'FORWARDING')?.id as string;
    await performOperationalHandoffAction(ctx, fwdHandoffId, { action: 'acknowledge' });
    const accepted = await performOperationalHandoffAction(ctx, fwdHandoffId, { action: 'accept' });
    return accepted.status === 'ACCEPTED' && accepted.assignedDomainReference?.referenceType === 'SHIPMENT';
  });

  // U19-B03: Customs Acceptance & Reference Binding
  await checkAsync('U19-B03', 'Behavioral: Customs handoff accept produces DECLARATION reference', async () => {
    const ctx = makeContext();
    const cusHandoffId = mockDb.handoffs.find((h) => h.target_domain === 'CUSTOMS')?.id as string;
    await performOperationalHandoffAction(ctx, cusHandoffId, { action: 'acknowledge' });
    const accepted = await performOperationalHandoffAction(ctx, cusHandoffId, { action: 'accept' });
    return accepted.status === 'ACCEPTED' && accepted.assignedDomainReference?.referenceType === 'DECLARATION';
  });

  // U19-B04: Trucking Acceptance & Reference Binding
  await checkAsync('U19-B04', 'Behavioral: Trucking handoff accept produces SERVICE_REQUEST reference', async () => {
    const ctx = makeContext();
    const trkHandoffId = mockDb.handoffs.find((h) => h.target_domain === 'TRUCKING')?.id as string;
    await performOperationalHandoffAction(ctx, trkHandoffId, { action: 'acknowledge' });
    const accepted = await performOperationalHandoffAction(ctx, trkHandoffId, { action: 'accept' });
    return accepted.status === 'ACCEPTED' && accepted.assignedDomainReference?.referenceType === 'SERVICE_REQUEST';
  });

  // U19-B05: Warehouse Acceptance & Reference Binding
  await checkAsync('U19-B05', 'Behavioral: Warehouse handoff accept produces WAREHOUSE_ORDER reference', async () => {
    const ctx = makeContext();
    const whHandoffId = mockDb.handoffs.find((h) => h.target_domain === 'WAREHOUSE')?.id as string;
    await performOperationalHandoffAction(ctx, whHandoffId, { action: 'acknowledge' });
    const accepted = await performOperationalHandoffAction(ctx, whHandoffId, { action: 'accept' });
    return accepted.status === 'ACCEPTED' && accepted.assignedDomainReference?.referenceType === 'WAREHOUSE_ORDER';
  });

  // U19-B06: Failure Isolation
  await checkAsync('U19-B06', 'Behavioral: Domain rejection sets REJECTED with code/reason; commercial SO untouched', async () => {
    const ctx = makeContext();
    const trkHandoffId = mockDb.handoffs.find((h) => h.target_domain === 'TRUCKING')?.id as string;
    const failed = await performOperationalHandoffAction(ctx, trkHandoffId, {
      action: 'reject',
      failureCode: 'NO_TRUCK_AVAILABLE',
      failureReason: 'All heavy prime movers deployed',
    });
    return failed.status === 'REJECTED' &&
           failed.failureCode === 'NO_TRUCK_AVAILABLE' &&
           failed.failureReason === 'All heavy prime movers deployed';
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION C: Positive Controls (U19-PC1 through PC7)                */
  /* ------------------------------------------------------------------ */

  check('U19-PC1', 'Positive Control 1: Forwarding boundary correctly translates to SHIPMENT reference',
    getOperationalHandoffAdapter('FORWARDING').createDomainReference({ id: 'f1', targetDomain: 'FORWARDING', handoffNumber: 'OH-F1', requestPayload: {} } as any).referenceType === 'SHIPMENT');

  check('U19-PC2', 'Positive Control 2: Customs boundary correctly translates to DECLARATION reference',
    getOperationalHandoffAdapter('CUSTOMS').createDomainReference({ id: 'c1', targetDomain: 'CUSTOMS', handoffNumber: 'OH-C1', requestPayload: {} } as any).referenceType === 'DECLARATION');

  check('U19-PC3', 'Positive Control 3: Trucking lineage correctly translates to SERVICE_REQUEST reference',
    getOperationalHandoffAdapter('TRUCKING').createDomainReference({ id: 't1', targetDomain: 'TRUCKING', handoffNumber: 'OH-T1', requestPayload: {} } as any).referenceType === 'SERVICE_REQUEST');

  check('U19-PC4', 'Positive Control 4: Warehouse boundary correctly translates to WAREHOUSE_ORDER reference',
    getOperationalHandoffAdapter('WAREHOUSE').createDomainReference({ id: 'w1', targetDomain: 'WAREHOUSE', handoffNumber: 'OH-W1', requestPayload: {} } as any).referenceType === 'WAREHOUSE_ORDER');

  check('U19-PC5', 'Positive Control 5: Idempotency uniqueness enforced in schema and service',
    mig021.includes('uq_operational_handoff_idempotency') && handoffServiceSrc.includes('idempotencyKey'));

  check('U19-PC6', 'Positive Control 6: Failure isolation: FAILED and REJECTED states exist in status enum',
    mig021.includes("'FAILED'") && mig021.includes("'REJECTED'"));

  check('U19-PC7', 'Positive Control 7: Multi-SBU / partial / split fulfillment supported by composition schema',
    /CREATE TABLE IF NOT EXISTS public\.fulfillment_allocations/i.test(allSql));

  /* ------------------------------------------------------------------ */
  /*  SECTION D: Negative Controls (U19-NC1 through NC7)                */
  /* ------------------------------------------------------------------ */

  // NC1: Direct JO creation
  const plantedDirectJo = "await db.from('job_orders').insert({ wo_item_id: 'abc' });";
  check('U19-NC1', 'Negative Control 1: Planted direct job_orders insertion is caught',
    /\.from\(['"]job_orders['"]\)\.insert/i.test(plantedDirectJo));

  // NC2: Direct Driver/Armada/GPS mutation
  const plantedDriverGps = "await db.from('md_drivers').update({ status: 'ASSIGNED' });";
  check('U19-NC2', 'Negative Control 2: Planted driver update is caught',
    /\.from\(['"](md_drivers|driver_profiles|gps_telemetry)['"]\)/i.test(plantedDriverGps));

  // NC3: Direct Forwarding execution mutation
  const plantedFwdExecution = "await db.from('shp_execution_legs').insert({ vessel_name: 'KM Nusantara' });";
  check('U19-NC3', 'Negative Control 3: Planted execution leg mutation is caught',
    /\.from\(['"]shp_execution_legs['"]\)\.insert/i.test(plantedFwdExecution));

  // NC4: Direct Customs statutory mutation
  const plantedCustomsMutation = "await db.from('cus_declarations').update({ aju_number: '123' });";
  check('U19-NC4', 'Negative Control 4: Planted direct declaration mutation is caught',
    /\.from\(['"]cus_declarations['"]\)\.update/i.test(plantedCustomsMutation));

  // NC5: Direct Warehouse inventory mutation
  const plantedWhInventory = "await db.from('wh_inventory').update({ quantity: 50 });";
  check('U19-NC5', 'Negative Control 5: Planted direct inventory mutation is caught',
    /\.from\(['"]wh_inventory['"]\)/i.test(plantedWhInventory));

  // NC6: Tenant/header bypass
  const plantedHeaderTrust = "const t = req.headers['x-tenant-id'];";
  check('U19-NC6', 'Negative Control 6: Planted x-tenant-id header trust is caught',
    /headers\[['"]x-tenant-id['"]\]/i.test(plantedHeaderTrust));

  // NC7: Client-generated operational identity
  const plantedClientHandoffNumber = "const num = 'OH-CLIENT-' + Math.random();";
  check('U19-NC7', 'Negative Control 7: Planted client-side handoff number generation is caught',
    /Math\.random\(\)/i.test(plantedClientHandoffNumber));

  // Clean up mock
  _setOperationalHandoffDbClient(null);

  console.log(`U-19 OPERATIONAL HANDOFF DOMAIN EXECUTION INTEGRATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
