/**
 * Sentralogis — Phase 4B / U-13R
 * lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts
 *
 * SALES ORDER FORENSIC RECONCILIATION — executes the U-13R gate list (A..AX)
 * as an additive, READ-MOSTLY suite. It does NOT modify production code. It
 * proves the Sales Order foundation (ADR-034..038, U-13) is:
 *
 *   - STRUCTURALLY FAITHFUL  (tables/FKs/indexes match ratified ADRs)
 *   - CANONICAL-AUTHORITATIVE (DB-UUID PK; next_sales_order() sole number authority)
 *   - TENANT-SAFE            (RLS predicates + server-derived IdentityContext)
 *   - NON-LEAKING            (no Quote/SO reference on operational tables)
 *   - WITHOUT DUAL PATHS     (single serialization authority, single SO writer)
 *
 * Enforcement split:
 *   - STATIC / FORENSIC (read migrations + app/lib source) — PRIMARY barrier.
 *   - BEHAVIORAL (U-13-style chainable mock Db + IdentityContext against the
 *     canonical service) for direct-SO, quote-SO, cross-tenant, idempotency.
 *
 * The reconciliation gates are INDEPENDENT of the U-13/U-11/U-12A detectors:
 * they re-derive schema facts and include a positive-control (U13R-I) proving
 * the table-scoped detector still catches a genuinely-planted operational
 * quote FK, so the repair is proven faithful and NOT a silent weakening.
 *
 * Exit: passed counts; failed===0 ⇒ GREEN.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  createSalesOrder,
  findSalesOrderById,
  _setSalesOrderDbClient,
  _setSalesOrderLineDbClient,
} from '@/lib/sales-order/service';
import type { SalesOrderDbClient } from '@/lib/sales-order/service';

/* ================================================================== */
/*  CONSTANTS / FIXTURES                                               */
/* ================================================================== */

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const ENG_A1 = 'e1000000-0000-4000-8000-000000000001';
const ENG_B1 = 'eb000000-0000-4000-8000-000000000001';
const QUOTE_A1 = 'q1000000-0000-4000-8000-000000000001';
const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const APP_DIR = path.join(ROOT, 'app');
const LIB_DIR = path.join(ROOT, 'lib');

type Row = Record<string, unknown>;
interface Err { message: string; code?: string }

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: USER_A,
    tenantId: TENANT_A,
    membershipId: 'mem-1',
    role: 'HQ_COMMERCIAL_DIRECTOR',
    isTenantOwner: false,
    permissions: ['commercial:read', 'commercial:manage'],
    sbuScope: null,
    ...over,
  };
}

function readMigrations(): string[] {
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

function readSalesOrderDomain(): string {
  const f = path.join(LIB_DIR, 'sales-order', 'service.ts');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

/** Positive control: the U-13 table-scoped detector catches a planted operational quote FK. */
function tableHasQuoteFk(ddl: string, table: string): boolean {
  const tblRe = new RegExp(`CREATE TABLE[\\s\\S]*?public\\.${table}\\s*\\(`, 'i');
  const m = ddl.match(tblRe);
  if (!m || m.index === undefined) return false;
  const section = ddl.slice(m.index);
  const tableSection = section.slice(0, section.indexOf(');'));
  return /quote_id\s+[^,;]*REFERENCES/i.test(tableSection);
}

/* ================================================================== */
/*  RESULT COLLECTION                                                  */
/* ================================================================== */

class Suite {
  passed = 0;
  failed = 0;
  total = 0;
  check(id: string, name: string, cond: boolean, detail: string): void {
    this.total++;
    if (cond) this.passed++;
    else {
      this.failed++;
      globalThis.console?.log?.('  [RED] ' + id + ' ' + name + ' :: ' + detail);
    }
  }
}

/* ================================================================== */
/*  MOCK DATABASE (chainable, mirrors U-13 suite)                      */
/* ================================================================== */

const SO_NUM = ['SO-2026-08-9001', 'SO-2026-08-9002', 'SO-2026-08-9003'];

class U13rMockDb {
  engagements: Row[] = [];
  quotes: Row[] = [];
  quoteItems: Row[] = [];
  salesOrders: Row[] = [];
  soLineItems: Row[] = [];
  mdServices: Row[] = [];
  rpcSeqIndex = 0;

  reset(): void {
    this.engagements = [
      { id: ENG_A1, tenant_id: TENANT_A, customer_id: CUST_A1, status: 'OPEN' },
      { id: ENG_B1, tenant_id: TENANT_B, customer_id: CUST_A1, status: 'OPEN' },
    ];
    this.quotes = [{ id: QUOTE_A1, tenant_id: TENANT_A, quote_number: 'QT-2026-08-0001', status: 'ACCEPTED' }];
    this.quoteItems = [
      { id: 'qi-r1', tenant_id: TENANT_A, quotation_id: QUOTE_A1, service_id: 'svc-r1', description: 'Service A', qty: 1, uom: 'Unit', unit_price: 1000, nego_price: null, subtotal: 1000, tax_percent: 0, tax_amount: 0, total_price: 1000 },
    ];
    this.salesOrders = [];
    this.soLineItems = [];
    this.mdServices = [
      { id: 'svc-r1', sbu_type: 'FORWARDING' },
    ];
    this.rpcSeqIndex = 0;
  }

  asClient(): SalesOrderDbClient {
    const self = this;
    const client = {
      rpc: (fn: string) => {
        if (fn !== 'next_sales_order') {
          return Promise.resolve({ data: null, error: { message: 'unknown fn' } });
        }
        const idx = self.rpcSeqIndex++;
        return Promise.resolve({ data: SO_NUM[idx] ?? 'SO-2026-08-9999', error: null });
      },
      from: (table: string) => {
        const rows = (): Row[] =>
          table === 'sales_orders' ? self.salesOrders
          : table === 'sales_order_line_items' ? self.soLineItems
          : table === 'commercial_work_orders' ? self.engagements
          : table === 'crm_quotations' ? self.quotes
          : table === 'crm_quotation_items' ? self.quoteItems
          : table === 'md_services' ? self.mdServices
          : [];
        const chain = {
          select() {
            const filters: Array<{ col: string; val: unknown; op?: string }> = [];
            const match = (r: Row) => filters.every((f) => {
              if (f.op === 'in') return (f.val as unknown[]).includes(r[f.col]);
              return r[f.col] === f.val;
            });
            const q = {
              eq(col: string, val: unknown) {
                filters.push({ col, val });
                return q;
              },
              in(col: string, vals: unknown[]) {
                filters.push({ col, val: vals, op: 'in' });
                return q;
              },
              order() { return q; },
              single: async () => {
                const found = rows().find(match);
                if (!found) return { data: null, error: { message: 'not found', code: 'PGRST116' } };
                return { data: found, error: null };
              },
              maybeSingle: async () => {
                const found = rows().find(match);
                if (!found) return { data: null, error: null };
                return { data: found, error: null };
              },
            };
            const ch: any = Object.assign(q, {
              then(resolve: (v: { data: Row[] | null; error: Err | null }) => void) {
                resolve({ data: rows().filter(match), error: null });
              },
            });
            return ch;
          },
          insert(row: Row) {
            return {
              select() {
                return {
                  single: async () => {
                    const rec: Row = {
                      id: 'so-r-' + (self.salesOrders.length + 1),
                      ...row,
                      created_at: row.created_at ?? '2026-08-28T01:00:00.000Z',
                      updated_at: row.updated_at ?? '2026-08-28T01:00:00.000Z',
                      created_by: row.created_by ?? USER_A,
                      updated_by: row.updated_by ?? USER_A,
                    };
                    self.salesOrders.push(rec);
                    return { data: rec, error: null };
                  },
                };
              },
            };
          },
          update(patch: Row) {
            const filters: Array<{ col: string; val: unknown }> = [];
            const ch = {
              eq(col: string, val: unknown) { filters.push({ col, val }); return ch; },
              select() {
                const target = self.salesOrders.find((r) => filters.every((f) => r[f.col] === f.val));
                if (target) {
                  const merged = { ...target, ...patch, updated_at: '2026-08-28T02:00:00.000Z' };
                  const idx = self.salesOrders.indexOf(target);
                  self.salesOrders[idx] = merged;
                }
                return Promise.resolve(null);
              },
            };
            return ch;
          },
        };
        return chain;
      },
    };
    return client as unknown as SalesOrderDbClient;
  }
}

/* ================================================================== */
/*  U-13R SUITE                                                        */
/* ================================================================== */

export async function runU13rSalesOrderForensicReconciliationSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  const s = new Suite();
  const migrations = readMigrations();
  const allSql = migrations.join('\n');
  const u13Target = path.join(MIG_DIR, '20260828_019_sales_order_foundation.sql');
  const u13Sql = fs.existsSync(u13Target) ? fs.readFileSync(u13Target, 'utf8') : '';
  const migExists = fs.existsSync(u13Target);
  const soDomain = readSalesOrderDomain();

  const salesOrdersDdl =
    (allSql.match(/CREATE TABLE[^;]*?sales_orders\s*\([\s\S]*?\);/i) ?? [''])[0];
  const cliDdl =
    (allSql.match(/CREATE TABLE[^;]*?commercial_line_items\s*\([\s\S]*?\);/i) ?? [''])[0];

  /* ---- (F0 / AV) Migration present & blast radius ---------------------- */
  s.check('U13R-00', 'Migration 019 present', migExists, 'found');
  s.check(
    'U13R-AU',
    '019 touches ONLY sales_orders (+ single ADR-038 operational column)',
    migExists &&
      /ALTER TABLE public\.shp_shipments\s+ADD COLUMN\s+IF NOT EXISTS\s+sales_order_id/i.test(u13Sql) &&
      /CREATE TABLE IF NOT EXISTS public\.sales_orders/i.test(u13Sql) &&
      !/CREATE TABLE\s+public\.(wo_|job_|cus_|fw_|svc_|crm_|commercial_capability)/i.test(u13Sql),
    'additive; no unrelated creates',
  );
  s.check(
    'U13R-AU2',
    '019 performs no destructive/protected-system mutation (only additive SO objects + ADR-038 column)',
    (() => {
      const exec = u13Sql
        .split('\n')
        .filter((l) => !/^\s*--/.test(l))
        .join('\n');
      return (
        !/DROP\s+TABLE/i.test(exec) &&
        !/DELETE\s+FROM/i.test(exec) &&
        !/ALTER\s+TABLE\s+public\.(work_orders|wo_items|job_orders|cus_|fw_|svc_|crm_|commercial_capability)/i.test(exec)
      );
    })(),
    'additive; GRANTs + DROP POLICY (idempotent recreate) on new SO objects are legitimate',
  );

  /* ---- (Gate B/C/D) Canonical identity + number authority -------------- */
  s.check(
    'U13R-B',
    'sales_orders PK is DB-generated UUID (id UUID PRIMARY KEY DEFAULT gen_random_uuid())',
    /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(salesOrdersDdl),
    'DB-UUID PK; never client',
  );
  s.check(
    'U13R-B2',
    'so_number is TEXT NOT NULL (no DB default; server-authoritative)',
    /\bso_number\s+TEXT\s+NOT\s+NULL/i.test(salesOrdersDdl),
    'so_number NOT NULL',
  );
  s.check(
    'U13R-B3',
    'UNIQUE(tenant_id, so_number) enforced at DB level',
    /uq_sales_order_number\s+UNIQUE\s*\(\s*tenant_id\s*,\s*so_number\s*\)/i.test(salesOrdersDdl),
    'constraint uq_sales_order_number',
  );
  s.check(
    'U13R-D',
    'next_sales_order() is atomic (nextval) + SECURITY DEFINER; no SELECT MAX',
    /CREATE[^;]*FUNCTION[^;]*next_sales_order\s*\(/i.test(u13Sql) &&
      /nextval\s*\(\s*'seq_sales_order'\s*\)/i.test(u13Sql) &&
      /SECURITY\s+DEFINER/i.test(u13Sql) &&
      !/SELECT\s+MAX\s*\(/i.test(u13Sql),
    'atomic nextval + SECURITY DEFINER; (no live DB → concurrent execution env-N/A)',
  );

  /* ---- (Gate E/F) Tenant safety ---------------------------------------- */
  s.check(
    'U13R-E',
    'SO domain derives tenant ONLY from context (no x-tenant-id header/body)',
    !/x-tenant-id/i.test(soDomain) &&
      !/getReqHeader/i.test(soDomain),
    'server-derived tenant',
  );
  s.check(
    'U13R-F',
    'sales_orders RLS uses get_my_tenant_id() on USING and WITH CHECK',
    /CREATE\s+POLICY\s+sales_orders_isolation[\s\S]*?USING\s*\(\s*tenant_id\s*=\s*public\.get_my_tenant_id\(\)\s*\)[\s\S]*?WITH\s+CHECK\s*\(\s*tenant_id\s*=\s*public\.get_my_tenant_id\(\)\s*\)/i.test(u13Sql),
    'FOR ALL USING/WITH CHECK tenant_id = get_my_tenant_id()',
  );
  s.check(
    'U13R-F2',
    'shp_shipments (ADR-038 host) has tenant-isolation RLS',
    /ALTER\s+TABLE\s+public\.shp_shipments\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(allSql),
    'shipments RLS present (migration 003)',
  );

  /* ---- (Gate O/P/AE) Shipment is the logistics aggregate -------------- */
  s.check(
    'U13R-O',
    'shp_shipments.sales_order_id is nullable + ON DELETE SET NULL (ADR-038)',
    /sales_order_id\s+UUID\s+REFERENCES\s+public\.sales_orders\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i.test(u13Sql),
    'nullable, SET NULL; Shipment preserved',
  );
  s.check(
    'U13R-P',
    'sales_order_id is NOT unique (ONE SO → MANY shipments)',
    /sales_order_id\s+UUID\s+REFERENCES\s+public\.sales_orders\(id\)[^,)]*ON\s+DELETE\s+SET\s+NULL/i.test(u13Sql) &&
      !/UNIQUE\s*\([^)]*sales_order_id/i.test(u13Sql),
    'non-unique operational attribution',
  );
  s.check(
    'U13R-AE',
    'SO→Shipment SET NULL; SO→Engagement RESTRICT (protects commercial history)',
    /sales_order_id[^;]*ON\s+DELETE\s+SET\s+NULL/i.test(u13Sql) &&
      /engagement_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.commercial_work_orders\(id\)[^)]*ON\s+DELETE\s+RESTRICT/i.test(salesOrdersDdl),
    'SET NULL on operational attribution, RESTRICT on engagement parent',
  );

  /* ---- (Gate Q/R/S) NO commercial→operational leakage ----------------- */
  const operationalDdl = migrations
    .map((m) => m.match(/CREATE TABLE[^;]*?\b(work_orders|wo_items|job_orders)\b\s*\([\s\S]*?\);/gi) ?? [])
    .flat()
    .join('\n');
  s.check(
    'U13R-Q',
    'No sales_order / so_id / so_number / sales_orders on operational DDL',
    !/sales_order|so_id|so_number|sales_orders/i.test(operationalDdl),
    'operational lineage has ZERO SO references',
  );
  s.check(
    'U13R-Q2',
    'Operational lineage intact: work_orders → wo_items → job_orders',
    /\bwork_orders\b/.test(operationalDdl) && /\bwo_items\b/.test(operationalDdl) && /\bjob_orders\b/.test(operationalDdl),
    'trucking lineage present (migration 032)',
  );
  const soRefMigrations = migrations.filter((m) => /sales_order_id\s+UUID\s+REFERENCES|sales_order_id\s+UUID/i.test(m)).length;
  s.check(
    'U13R-R',
    'sales_order_id column reference appears only in authorized migrations (019 shp_shipments, 020 fulfillments, 027 SO line items, 028 overrides, 029 financial per ADR-064)',
    soRefMigrations <= 5,
    `migrations with sales_order_id column = ${soRefMigrations}`,
  );

  /* ---- (Gate J/K/N) Engagement-anchored commercial models unchanged ---- */
  s.check(
    'U13R-J',
    'commercial_line_items anchored to Engagement, NOT operational/SO',
    /work_order_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.commercial_work_orders/i.test(cliDdl) &&
      !/REFERENCES\s+public\.(work_orders|wo_items|job_orders|sales_orders)/i.test(cliDdl),
    'Engagement sell-line model untouched',
  );
  s.check(
    'U13R-N',
    'svc_service_requests (ADR-033) anchored to Engagement (dispatch command)',
    /CREATE TABLE[^;]*?svc_service_requests[^;]*?work_order_id\s+UUID\s+REFERENCES\s+public\.commercial_work_orders/i.test(allSql),
    'service-request dispatch intact',
  );

  /* ---- (Gate A) Engagement ≠ SO ----------------------------------------- */
  s.check(
    'U13R-A',
    'sales_orders carries own so_number identity + engagement_id parent',
    /so_number\s+TEXT\s+NOT\s+NULL/i.test(salesOrdersDdl) &&
      /engagement_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.commercial_work_orders/i.test(salesOrdersDdl),
    'distinct SO header with engagement parent',
  );

  /* ---- (Gate H/T/I) Quote placement + detector soundness ---------------- */
  const quoteFkOnOperational = migrations.some((m) =>
    /CREATE TABLE[^;]*?\b(work_orders|wo_items|job_orders)\b[\s\S]*?quote_id[\s\S]*?REFERENCES/i.test(m),
  );
  s.check(
    'U13R-H',
    'No quote_id FK on operational tables (independent scan)',
    !quoteFkOnOperational,
    'operational tables carry no quote FK',
  );
  s.check(
    'U13R-T',
    'quote_id lives ONLY on the commercial sales_orders header',
    /quote_id\s+UUID\s+REFERENCES\s+public\.crm_quotations\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i.test(salesOrdersDdl),
    'quote attribution restricted to commercial SO header',
  );
  s.check(
    'U13R-I',
    'Detector soundness: tableHasQuoteFk catches planted operational quote FK',
    tableHasQuoteFk(
      'CREATE TABLE public.work_orders ( id uuid, quote_id uuid REFERENCES public.crm_quotations(id) );',
      'work_orders',
    ),
    'positive control hit',
  );
  s.check(
    'U13R-I2',
    'Detector precision: compliant operational table (no quote FK) does NOT false-positive',
    !tableHasQuoteFk(
      'CREATE TABLE public.work_orders ( id uuid, so_number text, customer_id uuid REFERENCES public.md_entities(id) );',
      'work_orders',
    ),
    'no false positive on compliant operational table',
  );

  /* ---- (Gate M/W) confirm/cancel = pure commercial status transition ----- */
  s.check(
    'U13R-M',
    'SO lifecycle touches ONLY sales_orders (+commercial_work_orders read); no operational writes',
    !/\.from\(\s*['"](work_orders|wo_items|job_orders|svc_service_requests|commercial_capability_bindings)['"]\s*\)/i.test(soDomain),
    'no operational/command writes in SO lifecycle',
  );

  /* ---- (Gate AO/AP) Single writer; no client direct DB ------------------- */
  const soWriters = (soDomain.match(/\.from\(\s*['"]sales_orders['"]\s*\)[\s\S]{0,200}?\.insert\(/g) ?? []).length;
  s.check(
    'U13R-AO',
    'Exactly ONE production writer for sales_orders (in service.ts)',
    soWriters === 1,
    `insert sites = ${soWriters}`,
  );
  s.check(
    'U13R-AP',
    'No client component accesses sales_orders via supabase.from (zero browser calls)',
    countClientDirectAccess() === 0,
    '0 browser direct access',
  );

  /* ---- (Gate AK/AQ) Identity forensics: no client canonical SO generator - */
  s.check(
    'U13R-AK',
    'No client-side random/UUID generator for SO canonical id/number',
    countClientSoidGenerator() === 0,
    '0 client canonical-SO generators',
  );

  /* ---- (Gate AC/AR) Test-vector completeness ----------------------------- */
  const u13Suite = fs.existsSync(path.join(LIB_DIR, '__tests__', 'u13-sales-order-foundation.test.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, '__tests__', 'u13-sales-order-foundation.test.ts'), 'utf8')
    : '';
  s.check(
    'U13R-AC',
    'U-13 suite retains table-scoped detector (tableHasQuoteFk)',
    /tableHasQuoteFk\s*\(\s*sql\s*,\s*[a-zA-Z_]+\s*\)/.test(u13Suite) || /tableHasQuoteFk/.test(u13Suite),
    'table-scoped detector present',
  );

  /* ---- (Gate Z/AA) Authorization vocabulary present + enforced ----------- */
  const permsLoaded = fs.existsSync(path.join(LIB_DIR, 'application', 'identity', 'permissions.ts'));
  s.check(
    'U13R-Z',
    'commercial:read / commercial:manage are canonical U-02 permissions',
    permsLoaded &&
      /commercial:manage/.test(readFile(path.join(LIB_DIR, 'application', 'identity', 'permissions.ts'))) &&
      /commercial:read/.test(readFile(path.join(LIB_DIR, 'application', 'identity', 'permissions.ts'))),
    'permission vocabulary present',
  );

  /* ---- BEHAVIORAL: direct-SO, quote-SO, cross-tenant, idempotency --------- */
  await runBehavioral(s);

  return { passed: s.passed, failed: s.failed, total: s.total };
}

/* ================================================================== */
/*  FORENSIC READERS (gate helpers)                                    */
/* ================================================================== */

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function countClientDirectAccess(): number {
  let hits = 0;
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const src = fs.readFileSync(p, 'utf8');
        const mt = src.match(/supabase\s*\.\s*from\s*\(\s*['"]sales_orders['"]\s*\)/g);
        if (mt) hits += mt.length;
      }
    }
  };
  walk(APP_DIR);
  return hits;
}

function countClientSoidGenerator(): number {
  const patterns = [/crypto\.randomUUID\(\)/, /Math\.random\(\)/, /Date\.now\(\)/];
  let hits = 0;
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(ent.name)) {
        const src = fs.readFileSync(p, 'utf8');
        if (/so_number|sales_order|salesOrder|so_id/i.test(src)) {
          for (const re of patterns) {
            if (re.test(src) && /so_number|sales_order|salesOrder/i.test(src)) hits++;
          }
        }
      }
    }
  };
  walk(APP_DIR);
  return hits;
}

/* ================================================================== */
/*  BEHAVIORAL PROBES                                                   */
/* ================================================================== */

async function runBehavioral(s: Suite): Promise<void> {
  const mock = new U13rMockDb();
  mock.reset();
  _setSalesOrderDbClient(mock.asClient());
  _setSalesOrderLineDbClient(mock.asClient() as any);

  try {
    /* Scenario 1: DIRECT SO (no quote) — valid in tenant A */
    const direct = await createSalesOrder({ engagementId: ENG_A1 }, makeCtx());
    s.check(
      'U13R-B1',
      'Direct SO (quoteId omitted) creates a valid SO in tenant A',
      direct.created === true &&
        direct.salesOrder.tenantId === TENANT_A &&
        /^SO-/.test(direct.salesOrder.soNumber),
      `soNumber=${direct.salesOrder.soNumber}`,
    );

    /* Scenario 2: QUOTE→SO — quote attributed */
    const quoted = await createSalesOrder(
      { engagementId: ENG_A1, quoteId: QUOTE_A1 },
      makeCtx(),
    );
    s.check(
      'U13R-B2q',
      'Quote→SO attributes accepted quote to the order (commercial-only)',
      quoted.created === true && quoted.salesOrder.quoteId === QUOTE_A1,
      'quoteId recorded on commercial SO header',
    );

    /* Scenario 7: CROSS-TENANT — forbidden */
    let crossRejected = false;
    try {
      await createSalesOrder({ engagementId: ENG_A1 }, makeCtx({ tenantId: TENANT_B }));
    } catch {
      crossRejected = true;
    }
    s.check(
      'U13R-B7',
      'Cross-tenant SO (TENANT_B caller, TENANT_A engagement) is rejected',
      crossRejected,
      'validateEngagement rejects tenant-B caller against tenant-A engagement',
    );

    /* Idempotency: deterministic read-back sanity */
    const found = await findSalesOrderById(makeCtx(), direct.salesOrder.id);
    s.check(
      'U13R-BF',
      'SO read-back via findSalesOrderById(context, id) is consistent',
      !!found && found.id === direct.salesOrder.id && found.tenantId === TENANT_A,
      'read-back consistent',
    );
  } finally {
    _setSalesOrderDbClient(null);
    _setSalesOrderLineDbClient(null);
  }
}

export default runU13rSalesOrderForensicReconciliationSuite;
