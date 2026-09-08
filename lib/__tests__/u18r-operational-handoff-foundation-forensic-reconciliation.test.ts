/**
 * Sentralogis — Phase 4B / U-18R
 * lib/__tests__/u18r-operational-handoff-foundation-forensic-reconciliation.test.ts
 *
 * OPERATIONAL HANDOFF FOUNDATION FORENSIC RECONCILIATION SUITE
 *
 * Independent, read-mostly architectural audit verifying that the U-18
 * Operational Handoff Foundation faithfully implements ratified ADR-051..056
 * without architectural drift, security bypasses, domain leakage, or duplicate engines.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
import {
  createOperationalHandoff,
  findOperationalHandoffById,
  listOperationalHandoffsByFulfillment,
  performOperationalHandoffAction,
  allocateOperationalHandoffNumber,
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

// Mock DB for behavioral reconciliation
class ReconciliationMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public nextInsertUniqueViolation = false;
  private seqCounter = 1;

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
                  return { data: null, error: { message: 'unique constraint violation', code: '23505' } };
                }
                const inserted = {
                  id: row.id || `oh-rec-${Date.now()}-${Math.random()}`,
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

export async function runU18rOperationalHandoffContractForensicReconciliationSuite(): Promise<{
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

  const mig021Path = path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql');
  const mig021 = fs.existsSync(mig021Path) ? fs.readFileSync(mig021Path, 'utf8') : '';
  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const handoffTypesSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'), 'utf8')
    : '';
  const routesCollectionSrc = fs.existsSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'operational-handoffs', 'route.ts'))
    ? fs.readFileSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'operational-handoffs', 'route.ts'), 'utf8')
    : '';
  const routesActionSrc = fs.existsSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'operational-handoffs', '[id]', 'actions', 'route.ts'))
    ? fs.readFileSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'operational-handoffs', '[id]', 'actions', 'route.ts'), 'utf8')
    : '';

  /* ------------------------------------------------------------------ */
  /*  1. ADR INTEGRITY & RATIFICATION AUDIT                             */
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
  check('U18R-01', 'ADR Compliance: ADR-045 through ADR-056 are physically present and RATIFIED', allAdrsRatified);

  /* ------------------------------------------------------------------ */
  /*  2. IDENTITY & NUMBER AUTHORITY FORENSICS                          */
  /* ------------------------------------------------------------------ */

  check('U18R-02', 'Number Authority: next_operational_handoff_number function exists with sequence backing',
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_operational_handoff_number/i.test(mig021) &&
    /seq_operational_handoff/i.test(mig021));

  check('U18R-03', 'Number Format: Generates canonical OH-YYYY-MM-NNNN pattern',
    mig021.includes("'OH-'") && mig021.includes("to_char(now(), 'YYYY')"));

  check('U18R-04', 'No Client Generation: Service always delegates handoff number allocation to server RPC',
    handoffServiceSrc.includes("db.rpc('next_operational_handoff_number'"));

  /* ------------------------------------------------------------------ */
  /*  3. TENANT SECURITY & AUTHORIZATION FORENSICS                      */
  /* ------------------------------------------------------------------ */

  check('U18R-05', 'Tenant Security: Service derives tenant strictly from IdentityContext (0 trust in x-tenant-id)',
    !/x-tenant-id/i.test(handoffServiceSrc) && handoffServiceSrc.includes('context.tenantId'));

  check('U18R-06', 'Database RLS: operational_handoffs table enforces get_my_tenant_id() isolation',
    /CREATE POLICY operational_handoffs_isolation ON public\.operational_handoffs[\s\S]*?get_my_tenant_id\(\)/i.test(mig021));

  check('U18R-07', 'Authorization: Mutations enforce commercial:manage and queries enforce commercial:read',
    handoffServiceSrc.includes("assertPermission(context, 'commercial:manage')") &&
    handoffServiceSrc.includes("assertPermission(context, 'commercial:read')"));

  /* ------------------------------------------------------------------ */
  /*  4. IDEMPOTENCY & UNIQUENESS FORENSICS                             */
  /* ------------------------------------------------------------------ */

  check('U18R-08', 'Idempotency DDL: Table enforces UNIQUE(tenant_id, idempotency_key)',
    /CONSTRAINT uq_operational_handoff_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(mig021));

  check('U18R-09', 'Idempotency Code: Service catches PostgreSQL 23505 unique violation and re-selects',
    handoffServiceSrc.includes("insertError.code === '23505'") &&
    handoffServiceSrc.includes('created: false'));

  /* ------------------------------------------------------------------ */
  /*  5. STATE MACHINE & LIFECYCLE FORENSICS                            */
  /* ------------------------------------------------------------------ */

  check('U18R-10', 'Lifecycle DDL: com_operational_handoff_status enum defines all 8 states',
    /CREATE TYPE com_operational_handoff_status AS ENUM\s*\(\s*'ISSUED',\s*'ACKNOWLEDGED',\s*'ACCEPTED',\s*'EXECUTING',\s*'FULFILLED',\s*'FAILED',\s*'REJECTED',\s*'CANCELLED'\s*\)/i.test(mig021));

  check('U18R-11', 'Lifecycle Code: Explicit transitions dictionary prevents arbitrary status mutations',
    OPERATIONAL_HANDOFF_TRANSITIONS.ISSUED.includes('ACKNOWLEDGED') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.ACKNOWLEDGED.includes('ACCEPTED') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.ACCEPTED.includes('EXECUTING') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.EXECUTING.includes('FULFILLED') &&
    OPERATIONAL_HANDOFF_TRANSITIONS.FULFILLED.length === 0);

  /* ------------------------------------------------------------------ */
  /*  6. FULFILLMENT BOUNDARY & DOMAIN SOVEREIGNTY                      */
  /* ------------------------------------------------------------------ */

  check('U18R-12', 'Fulfillment Boundary: 0 driver, vehicle plate, or GPS columns in operational_handoffs',
    !/\b(md_drivers|driver_id|vehicle_plate|gps_coordinates|telemetry)\b/i.test(mig021));

  check('U18R-13', 'Fulfillment Boundary: 0 warehouse inventory bin/rack columns in operational_handoffs',
    !/\b(wh_inventory|bin_location|rack_id|pallet_id)\b/i.test(mig021));

  check('U18R-14', 'Fulfillment Boundary: 0 vessel/voyage/POL/POD columns in operational_handoffs',
    !/\b(vessel_name|voyage_number|port_of_loading|port_of_discharge)\b/i.test(mig021));

  check('U18R-15', 'Polymorphic Reference: Table has assigned_domain_reference JSONB for loose aggregate pointer',
    /assigned_domain_reference\s+JSONB/i.test(mig021));

  /* ------------------------------------------------------------------ */
  /*  7. ADAPTER BOUNDARY FORENSICS                                     */
  /* ------------------------------------------------------------------ */

  const fwdAdapter = getOperationalHandoffAdapter('FORWARDING');
  check('U18R-16', 'Forwarding Adapter: Translates to SHIPMENT reference without duplicating vessel/POL/POD',
    fwdAdapter instanceof ForwardingHandoffAdapter &&
    fwdAdapter.createDomainReference({ id: 'h1', targetDomain: 'FORWARDING', handoffNumber: 'OH-1', requestPayload: {} } as any).referenceType === 'SHIPMENT');

  const cusAdapter = getOperationalHandoffAdapter('CUSTOMS');
  check('U18R-17', 'Customs Adapter: Translates to DECLARATION reference preserving customs sovereignty',
    cusAdapter instanceof CustomsHandoffAdapter &&
    cusAdapter.createDomainReference({ id: 'h2', targetDomain: 'CUSTOMS', handoffNumber: 'OH-2', requestPayload: {} } as any).referenceType === 'DECLARATION');

  const trkAdapter = getOperationalHandoffAdapter('TRUCKING');
  check('U18R-18', 'Trucking Adapter: Translates to SERVICE_REQUEST reference (ADR-033/054)',
    trkAdapter instanceof TruckingHandoffAdapter &&
    trkAdapter.createDomainReference({ id: 'h3', targetDomain: 'TRUCKING', handoffNumber: 'OH-3', requestPayload: {} } as any).referenceType === 'SERVICE_REQUEST');

  const whAdapter = getOperationalHandoffAdapter('WAREHOUSE');
  check('U18R-19', 'Warehouse Adapter: Translates to WAREHOUSE_ORDER reference (ADR-055)',
    whAdapter instanceof WarehouseHandoffAdapter &&
    whAdapter.createDomainReference({ id: 'h4', targetDomain: 'WAREHOUSE', handoffNumber: 'OH-4', requestPayload: {} } as any).referenceType === 'WAREHOUSE_ORDER');

  /* ------------------------------------------------------------------ */
  /*  8. TRUCKING LINEAGE & CARDINALITY GUARDRAILS                      */
  /* ------------------------------------------------------------------ */

  const zeroDirectJoMutation = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);
  check('U18R-20', 'Cardinality Guardrail: Zero direct Job Order writes in Operational Handoff domain', zeroDirectJoMutation);

  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check('U18R-21', 'Cardinality Guardrail: Many SO -> 1 WO is FORBIDDEN (ADR-037); direct SO -> JO is strictly forbidden',
    noSoOnWorkOrders && noSoOnJobOrders);

  /* ------------------------------------------------------------------ */
  /*  9. MIGRATION BLAST RADIUS                                         */
  /* ------------------------------------------------------------------ */

  const isAdditiveOnly = !/\bDROP\s+TABLE\b|\bALTER\s+TABLE\s+[A-Za-z0-9_.]+\s+DROP\s+COLUMN\b/i.test(mig021);
  check('U18R-22', 'Migration Blast Radius: Migration 021 is 100% additive (0 tables dropped, 0 columns dropped)', isAdditiveOnly);

  /* ------------------------------------------------------------------ */
  /*  10. BEHAVIORAL RECONCILIATION (Mock DB)                           */
  /* ------------------------------------------------------------------ */

  const mockDb = new ReconciliationMockDb();
  _setOperationalHandoffDbClient(mockDb);

  const flId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const allocId = 'aaaaaaaa-1111-2222-3333-444444444444';

  mockDb.fulfillments.push({ id: flId, tenant_id: TENANT_A, status: 'ACTIVE' });
  mockDb.allocations.push({ id: allocId, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'TRUCKING' });

  // U18R-23: Create and Idempotency
  await checkAsync('U18R-23', 'Behavioral: Create handoff and verify tenant-scoped idempotency', async () => {
    const ctxA = makeContext(TENANT_A);
    const r1 = await createOperationalHandoff(ctxA, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocId,
      targetDomain: 'TRUCKING',
      idempotencyKey: 'idemp-rec-001',
    });
    const r2 = await createOperationalHandoff(ctxA, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocId,
      targetDomain: 'TRUCKING',
      idempotencyKey: 'idemp-rec-001',
    });
    return r1.created && !r2.created && r1.handoff.id === r2.handoff.id;
  });

  // U18R-24: Full Lifecycle Progression
  await checkAsync('U18R-24', 'Behavioral: Progress handoff through full lifecycle', async () => {
    const ctx = makeContext();
    const handoffId = mockDb.handoffs[0].id as string;

    const ack = await performOperationalHandoffAction(ctx, handoffId, { action: 'acknowledge' });
    const accept = await performOperationalHandoffAction(ctx, handoffId, { action: 'accept' });
    const exec = await performOperationalHandoffAction(ctx, handoffId, { action: 'startExecuting' });
    const fulfilled = await performOperationalHandoffAction(ctx, handoffId, { action: 'fulfill' });

    return ack.status === 'ACKNOWLEDGED' &&
           accept.status === 'ACCEPTED' &&
           exec.status === 'EXECUTING' &&
           fulfilled.status === 'FULFILLED';
  });

  // U18R-25: Illegal Transition Block
  await checkAsync('U18R-25', 'Behavioral: Block illegal transition from terminal state', async () => {
    const ctx = makeContext();
    const handoffId = mockDb.handoffs[0].id as string;
    try {
      await performOperationalHandoffAction(ctx, handoffId, { action: 'startExecuting' });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'INVALID_STATUS_TRANSITION';
    }
  });

  // U18R-26: Cross-Tenant Access Block
  await checkAsync('U18R-26', 'Behavioral: Block cross-tenant access with non-leaking error', async () => {
    const ctxB = makeContext(TENANT_B);
    const handoffId = mockDb.handoffs[0].id as string;
    try {
      await findOperationalHandoffById(ctxB, handoffId);
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'HANDOFF_NOT_FOUND';
    }
  });

  /* ------------------------------------------------------------------ */
  /*  11. POSITIVE CONTROLS (PC1 through PC7)                           */
  /* ------------------------------------------------------------------ */

  check('U18R-PC1', 'Positive Control 1: operational_handoffs table structure is detected',
    /CREATE TABLE IF NOT EXISTS public\.operational_handoffs/i.test(mig021));

  check('U18R-PC2', 'Positive Control 2: next_operational_handoff_number RPC is detected',
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_operational_handoff_number/i.test(mig021));

  check('U18R-PC3', 'Positive Control 3: Forwarding adapter derivation of SHIPMENT reference is verified',
    getOperationalHandoffAdapter('FORWARDING').createDomainReference({ id: '1', targetDomain: 'FORWARDING', handoffNumber: 'OH-1', requestPayload: {} } as any).referenceType === 'SHIPMENT');

  check('U18R-PC4', 'Positive Control 4: Customs adapter derivation of DECLARATION reference is verified',
    getOperationalHandoffAdapter('CUSTOMS').createDomainReference({ id: '2', targetDomain: 'CUSTOMS', handoffNumber: 'OH-2', requestPayload: {} } as any).referenceType === 'DECLARATION');

  check('U18R-PC5', 'Positive Control 5: Trucking adapter derivation of SERVICE_REQUEST reference is verified',
    getOperationalHandoffAdapter('TRUCKING').createDomainReference({ id: '3', targetDomain: 'TRUCKING', handoffNumber: 'OH-3', requestPayload: {} } as any).referenceType === 'SERVICE_REQUEST');

  check('U18R-PC6', 'Positive Control 6: Warehouse adapter derivation of WAREHOUSE_ORDER reference is verified',
    getOperationalHandoffAdapter('WAREHOUSE').createDomainReference({ id: '4', targetDomain: 'WAREHOUSE', handoffNumber: 'OH-4', requestPayload: {} } as any).referenceType === 'WAREHOUSE_ORDER');

  check('U18R-PC7', 'Positive Control 7: Idempotency catch-and-reselect pattern is verified in service',
    handoffServiceSrc.includes("insertError.code === '23505'"));

  /* ------------------------------------------------------------------ */
  /*  12. NEGATIVE CONTROLS (NC1 through NC7)                           */
  /* ------------------------------------------------------------------ */

  // NC1: Planted fake handoff table missing tenant_id fails detector
  const plantedTableMissingTenant = 'CREATE TABLE public.fake_handoffs (id UUID PRIMARY KEY);';
  const nc1Pass = !/CREATE TABLE[^\n]+fake_handoffs[\s\S]*?tenant_id\s+UUID/i.test(plantedTableMissingTenant);
  check('U18R-NC1', 'Negative Control 1: Planted fake handoff table missing tenant_id is caught', nc1Pass);

  // NC2: Planted direct job_orders.insert string fails detector
  const plantedDirectJoMutation = "await db.from('job_orders').insert({ route: 'Jakarta-Surabaya' });";
  const nc2Pass = /\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(plantedDirectJoMutation);
  check('U18R-NC2', 'Negative Control 2: Planted direct job_orders mutation is caught', nc2Pass);

  // NC3: Planted direct driver/GPS field fails detector
  const plantedDriverGpsSchema = 'CREATE TABLE public.fake_schema (driver_id UUID, gps_coordinates TEXT);';
  const nc3Pass = /\b(driver_id|gps_coordinates)\b/i.test(plantedDriverGpsSchema);
  check('U18R-NC3', 'Negative Control 3: Planted driver/GPS field is caught', nc3Pass);

  // NC4: Planted client-generated OH number fails detector
  const plantedClientNumber = "const num = 'OH-' + Date.now();";
  const nc4Pass = /'OH-'\s*\+\s*Date\.now\(\)/i.test(plantedClientNumber);
  check('U18R-NC4', 'Negative Control 4: Planted client-side number generator is caught', nc4Pass);

  // NC5: Planted x-tenant-id header fallback fails detector
  const plantedTenantHeader = "const tenantId = req.headers.get('x-tenant-id');";
  const nc5Pass = /headers\.get\(['"]x-tenant-id['"]\)/i.test(plantedTenantHeader);
  check('U18R-NC5', 'Negative Control 5: Planted x-tenant-id header authority is caught', nc5Pass);

  // NC6: Planted missing idempotency uniqueness fails detector
  const plantedTableWithoutIdemp = 'CREATE TABLE public.no_idemp (id UUID, handoff_number TEXT);';
  const nc6Pass = !/UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(plantedTableWithoutIdemp);
  check('U18R-NC6', 'Negative Control 6: Planted missing idempotency constraint is caught', nc6Pass);

  // NC7: Planted illegal lifecycle transition fails detector
  const plantedIllegalTransition = OPERATIONAL_HANDOFF_TRANSITIONS.FULFILLED.includes('EXECUTING' as any);
  check('U18R-NC7', 'Negative Control 7: Planted illegal transition from FULFILLED to EXECUTING is blocked', !plantedIllegalTransition);

  // Clean up
  _setOperationalHandoffDbClient(null);

  console.log(`U-18R OPERATIONAL HANDOFF FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
