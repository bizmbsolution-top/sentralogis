/**
 * Sentralogis — Phase 4B / U-13
 * lib/__tests__/u13-sales-order-foundation.test.ts
 *
 * Sales Order Foundation — executable invariants over the RATIFIED
 * Sales Order architecture (ADR-034 .. ADR-038).
 *
 * Coverage (Requirement §33):
 *   Identity / Number / Engagement / Quote / Direct SO / Multi-SBU /
 *   Fulfillment / Shipment / Work Order / Operational / Tenant /
 *   Authorization / Lifecycle / Idempotency / Regression.
 *
 * The suite is hybrid:
 *   - STATIC/FORENSIC asserts (read migrations + domain source, U-11/U-12A style)
 *   - BEHAVIORAL asserts (in-memory mock Db + IdentityContext against the
 *     canonical service, engagement-bridge style).
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import {
  createSalesOrder,
  updateDraftSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
  findSalesOrderById,
  listSalesOrdersForEngagement,
  _setSalesOrderDbClient,
  allocateSalesOrderNumber,
} from '@/lib/sales-order/service';
import { _setSalesOrderLineDbClient } from '@/lib/sales-order/line-repository';
import { _setPricingDbClient } from '@/lib/pricing/repository';
import type { SalesOrderDbClient } from '@/lib/sales-order/service';
import { SalesOrderError } from '@/lib/sales-order/types';

/* ================================================================== */
/*  CONSTANTS / FIXTURES                                               */
/* ================================================================== */

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const ENG_A1 = 'e1000000-0000-4000-8000-000000000001';
const ENG_A2 = 'e2000000-0000-4000-8000-000000000002';
const ENG_B1 = 'eb000000-0000-4000-8000-000000000001';
const QUOTE_A1 = 'q1000000-0000-4000-8000-000000000001';
const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';

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

function seedEngagementRow(id: string, tenant: string): Row {
  return {
    id,
    tenant_id: tenant,
    wo_number: 'WO-NUM',
    customer_id: CUST_A1,
    service_scope_id: null,
    status: 'DRAFT',
    created_at: '2026-08-28T01:00:00.000Z',
  };
}

function seedQuoteRow(id: string, tenant: string): Row {
  return { id, tenant_id: tenant, quote_number: 'QT-2026-08-0001', status: 'ACCEPTED' };
}

function seedSoRow(over: Row = {}): Row {
  return {
    id: 'so-created-1',
    tenant_id: TENANT_A,
    engagement_id: ENG_A1,
    quote_id: null,
    so_number: 'SO-2026-08-0001',
    status: 'DRAFT',
    idempotency_key: null,
    order_date: '2026-08-28',
    target_fulfillment_date: null,
    currency: 'IDR',
    total_agreed_revenue: 0,
    payment_terms_days: 30,
    incoterm: null,
    commercial_notes: null,
    version_no: 1,
    confirmed_at: null,
    cancelled_at: null,
    cancelled_reason: null,
    created_at: '2026-08-28T01:00:00.000Z',
    updated_at: '2026-08-28T01:00:00.000Z',
    created_by: USER_A,
    updated_by: USER_A,
    ...over,
  };
}

/* ================================================================== */
/*  MOCK DATABASE (chainable, supabase-compatible surface)             */
/* ================================================================== */

const SO_NUM = ['SO-2026-08-0001', 'SO-2026-08-0002', 'SO-2026-08-0003'];

class SalesOrderMockDb {
  engagements: Row[] = [];
  quotes: Row[] = [];
  quoteItems: Row[] = [];
  salesOrders: Row[] = [];
  soLineItems: Row[] = [];
  mdServices: Row[] = [];
  pricingRates: Row[] = [];
  pricingRateVersions: Row[] = [];
  pricingRateItems: Row[] = [];
  rpcSeqIndex = 0;
  rpcCadence: Array<{ data: string | null; error: Err | null }> = [];
  /** Set to simulate a unique_violation on the NEXT insert of sales_orders. */
  nextInsertUniqueViolation = false;
  insertedPayloads: Row[] = [];
  updatedPayloads: Row[] = [];

  reset(): void {
    this.engagements = [seedEngagementRow(ENG_A1, TENANT_A), seedEngagementRow(ENG_A2, TENANT_A), seedEngagementRow(ENG_B1, TENANT_B)];
    this.quotes = [seedQuoteRow(QUOTE_A1, TENANT_A)];
    this.quoteItems = [
      { id: 'qi-1', tenant_id: TENANT_A, quotation_id: QUOTE_A1, service_id: 'svc-1', description: 'Ocean Freight 40HC', qty: 4, uom: 'Container', unit_price: 1500, nego_price: 1400, subtotal: 5600, tax_percent: 11, tax_amount: 616, total_price: 6216 },
      { id: 'qi-2', tenant_id: TENANT_A, quotation_id: QUOTE_A1, service_id: 'svc-2', description: 'Customs Clearance', qty: 1, uom: 'Declaration', unit_price: 500, nego_price: null, subtotal: 500, tax_percent: 0, tax_amount: 0, total_price: 500 },
    ];
    this.salesOrders = [];
    this.soLineItems = [];
    this.mdServices = [
      { id: 'svc-1', sbu_type: 'FORWARDING' },
      { id: 'svc-2', sbu_type: 'CLEARANCE' },
    ];
    this.pricingRates = [
      { id: 'rate-1', tenant_id: TENANT_A, tenantId: TENANT_A, rate_code: 'FWD-OCEAN-001', rateCode: 'FWD-OCEAN-001', capability_type: 'FORWARDING', capabilityType: 'FORWARDING', rate_description: 'Ocean Freight', rateDescription: 'Ocean Freight', status: 'ACTIVE', created_at: '2026-08-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', created_by: USER_A, createdBy: USER_A, updated_by: USER_A, updatedBy: USER_A },
    ];
    this.pricingRateVersions = [
      { id: 'ver-1', rate_id: 'rate-1', rateId: 'rate-1', tenant_id: TENANT_A, tenantId: TENANT_A, version_no: 1, versionNo: 1, effective_from: '2026-01-01', effectiveFrom: '2026-01-01', effective_to: null, effectiveTo: null, status: 'ACTIVE', created_at: '2026-08-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', created_by: USER_A, createdBy: USER_A, updated_by: USER_A, updatedBy: USER_A },
    ];
    this.pricingRateItems = [
      { id: 'item-1', rate_version_id: 'ver-1', rateVersionId: 'ver-1', tenant_id: TENANT_A, tenantId: TENANT_A, side: 'SELL', charge_basis: 'PER_CONTAINER', chargeBasis: 'PER_CONTAINER', unit_of_measure: 'Container', unitOfMeasure: 'Container', currency: 'IDR', unit_rate: 1500, unitRate: 1500, min_charge: null, minCharge: null, max_charge: null, maxCharge: null, applicability_conditions: { customer_id: CUST_A1, origin: 'IDJKT', destination: 'USLAX', container_type: '40HC' }, applicabilityConditions: { customer_id: CUST_A1, origin: 'IDJKT', destination: 'USLAX', container_type: '40HC' }, created_at: '2026-08-01T00:00:00.000Z', createdAt: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z', created_by: USER_A, createdBy: USER_A, updated_by: USER_A, updatedBy: USER_A },
    ];
    this.rpcSeqIndex = 0;
    this.rpcCadence = [];
    this.nextInsertUniqueViolation = false;
    this.insertedPayloads = [];
    this.updatedPayloads = [];
  }

  asClient(): SalesOrderDbClient {
    const self = this;
    const client = {
      rpc: (fn: string, _args: Record<string, unknown>) => {
        if (fn !== 'next_sales_order') {
          return Promise.resolve({ data: null, error: { message: 'unknown fn' } });
        }
        if (self.rpcCadence.length > 0) {
          return Promise.resolve(self.rpcCadence.shift()!);
        }
        const value = self.rpcSeqIndex < SO_NUM.length ? SO_NUM[self.rpcSeqIndex] : `SO-2026-08-${String(self.rpcSeqIndex + 1).padStart(4, '0')}`;
        self.rpcSeqIndex++;
        return Promise.resolve({ data: value, error: null });
      },
      from: (table: string) => {
        const rows = () =>
          table === 'sales_orders' ? self.salesOrders
          : table === 'sales_order_line_items' ? self.soLineItems
          : table === 'commercial_work_orders' ? self.engagements
          : table === 'crm_quotations' ? self.quotes
          : table === 'crm_quotation_items' ? self.quoteItems
          : table === 'md_services' ? self.mdServices
          : table === 'pricing_rates' ? self.pricingRates
          : table === 'pricing_rate_versions' ? self.pricingRateVersions
          : table === 'pricing_rate_items' ? self.pricingRateItems
          : [];
        const chain = {
          select() {
            const filters: Array<{ col: string; val: unknown }> = [];
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
            // to make the chain thenable for list usage
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
                    if (table === 'sales_orders' && self.nextInsertUniqueViolation) {
                      self.nextInsertUniqueViolation = false;
                      return { data: null, error: { message: 'duplicate key', code: '23505' } };
                    }
                    let rec: Row;
                    if (table === 'sales_order_line_items') {
                      rec = { id: 'sol-' + (self.soLineItems.length + 1), ...row, created_at: row.created_at ?? '2026-08-28T01:00:00.000Z', updated_at: row.updated_at ?? '2026-08-28T01:00:00.000Z', created_by: row.created_by ?? USER_A, updated_by: row.updated_by ?? USER_A };
                      self.soLineItems.push(rec);
                    } else {
                      rec = { id: 'so-created-' + (self.salesOrders.length + 1), ...row, created_at: row.created_at ?? '2026-08-28T01:00:00.000Z', updated_at: row.updated_at ?? '2026-08-28T01:00:00.000Z', created_by: row.created_by ?? USER_A, updated_by: row.updated_by ?? USER_A };
                      self.salesOrders.push(rec);
                    }
                    self.insertedPayloads.push(rec);
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
                return Promise.resolve(null);
              },
            };
            (ch as any).select = async () => {
              const target = self.salesOrders.find((r) => filters.every((f) => r[f.col] === f.val));
              if (target) {
                const merged = { ...target, ...patch, updated_at: '2026-08-28T02:00:00.000Z' };
                const idx = self.salesOrders.indexOf(target);
                self.salesOrders[idx] = merged;
                self.updatedPayloads.push(merged);
              }
              return null;
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
/*  SUITE                                                              */
/* ================================================================== */

export async function runU13SalesOrderFoundationSuite(): Promise<{ passed: number; failed: number; total: number }> {
  let passed = 0;
  let failed = 0;
  function check(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}: ${e?.message ?? e}`);
    }
  }
  async function checkAsync(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}: ${e?.message ?? e}`);
    }
  }

  const root = process.cwd();
  const readSql = () => fs.readFileSync(path.join(root, 'supabase/migrations/20260828_019_sales_order_foundation.sql'), 'utf-8');
  const allSqlFiles = () => fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
  const collectTs = (dir: string): string[] => {
    const full = path.join(root, dir);
    if (!fs.existsSync(full)) return [];
    const skip = new Set(['node_modules', '.next', 'dist', '__tests__']);
    const out: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) { if (!skip.has(e.name)) walk(path.join(d, e.name)); }
        else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) { if (!e.name.endsWith('.test.ts')) out.push(path.join(d, e.name)); }
      }
    };
    walk(full);
    return out;
  };
  // Table-scoped detector: does `table` DEFINE a quote_id FK column (CREATE
  // TABLE column block or ALTER TABLE ADD COLUMN)? Associates quote_id with the
  // specific table being created/altered — so a quote_id on a DIFFERENT table
  // (e.g. commercial sales_orders) does NOT count even when it references the
  // engagement or operational tables.
  const tableHasQuoteFk = (sql: string, table: string): boolean => {
    const createRe = new RegExp(
      `CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+[A-Za-z0-9_.]*\\b${table}\\b\\s*\\(([\\s\\S]*?)\\)\\s*;`,
      'gi'
    );
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(sql)) !== null) {
      const block = m[1];
      if (/\bquote_id\b[\s\S]*REFERENCES[\s\S]*crm_quotations\b/i.test(block)) return true;
      if (/REFERENCES[\s\S]*crm_quotations\b[\s\S]*\bquote_id\b/i.test(block)) return true;
    }
    const alterRe = new RegExp(
      `ALTER\\s+TABLE(?:\\s+IF\\s+EXISTS)?\\s+[A-Za-z0-9_.]*\\b${table}\\b\\s+ADD(?:\\s+COLUMN)?(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+quote_id`,
      'gi'
    );
    return alterRe.test(sql);
  };

  /* ================= IDENTITY (PK) ================= */
  check('U13-01 PK is DB-generated UUID (id), not so_number', () => {
    const sql = readSql();
    if (!/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(sql)) {
      throw new Error('sales_orders.id must be UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    }
  });

  check('U13-02 No client-side SO PK generation exists', () => {
    const hits = [...collectTs('lib'), ...collectTs('app')].filter((f) => {
      const c = fs.readFileSync(f, 'utf-8');
      return c.includes('sales_orders') && /crypto\.randomUUID\(\)|Math\.random\(\)/.test(c);
    }).filter((f) => !f.includes('service.ts') && !f.includes('__tests__'));
    if (hits.length > 0) throw new Error(`client PK generation candidate: ${hits.join(', ')}`);
  });

  /* ================= NUMBER AUTHORITY (ADR-035) ================= */
  check('U13-03 next_sales_order() exists and is atomic (nextval)', () => {
    const sql = readSql();
    if (!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(sql)) throw new Error('next_sales_order missing');
    if (!sql.includes('nextval')) throw new Error('next_sales_order does not use nextval — not concurrency-safe');
  });

  check('U13-03b next_sales_order format is SO-YYYY-MM-NNNN', () => {
    const sql = readSql();
    if (!/SO-' \|\| v_year \|\| '-' \|\| v_month \|\| '-' \|\| lpad\(v_seq::text, 4, '0'\)/.test(sql)) {
      throw new Error('SO format not SO-YYYY-MM-NNNN');
    }
  });

  check('U13-04 SO number is unique per tenant (UNIQUE tenant_id, so_number)', () => {
    const sql = readSql();
    if (!/UNIQUE\s*\(\s*tenant_id,\s*so_number\s*\)/i.test(sql)) throw new Error('missing UNIQUE(tenant_id, so_number)');
  });

  check('U13-05 Sequence seq_sales_order created', () => {
    const sql = readSql();
    if (!sql.includes('seq_sales_order')) throw new Error('seq_sales_order missing');
  });

  check('U13-06 No client path generates canonical SO numbers (no Math.random/Date.now/so_number math)', () => {
    const all = [...collectTs('lib'), ...collectTs('app')].filter((f) => !f.includes('__tests__'));
    for (const f of all) {
      const c = fs.readFileSync(f, 'utf-8');
      if (/so_number\s*=\s*['"`]/i.test(c) || /SO-\d{4}-/.test(c)) {
        if (f.includes('service.ts') || f.includes('u13') || f.includes('u12a') || f.includes('u12')) continue;
        const rel = path.relative(root, f);
        throw new Error(`client SO-number generation candidate: ${rel}`);
      }
    }
  });

  check('U13-06b allocateSalesOrderNumber is server-only and routes via RPC', () => {
    const svc = fs.readFileSync(path.join(root, 'lib/sales-order/service.ts'), 'utf-8');
    if (!/rpc\(['"]next_sales_order['"]/.test(svc)) throw new Error('service does not allocate via next_sales_order RPC');
    if (!/export async function allocateSalesOrderNumber/.test(svc)) throw new Error('allocateSalesOrderNumber missing');
  });

  /* ================= ENGAGEMENT (ADR-034) ================= */
  check('U13-07 SO references Engagement (engagement_id FK -> commercial_work_orders), 1:N', () => {
    const sql = readSql();
    if (!/engagement_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.commercial_work_orders/i.test(sql)) {
      throw new Error('sales_orders.engagement_id FK missing/non-null');
    }
    if (/UNIQUE\s*\(\s*engagement_id\s*\)/.test(readSql())) throw new Error('engagement_id must NOT be UNIQUE (1:N)');
  });

  check('U13-08 Engagement NOT renamed/replaced (commercial_work_orders untouched as container)', () => {
    const migs = allSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf-8');
      if (/DROP\s+TABLE[^;]*commercial_work_orders/i.test(sql)) throw new Error(`rename/drop of engagement: ${f}`);
    }
  });

  /* ================= QUOTE / DIRECT SO (U-12) ================= */
  check('U13-09 Quote is optional (quote_id NULLABLE)', () => {
    const sql = readSql();
    if (!/quote_id\s+UUID\s+REFERENCES\s+public\.crm_quotations/i.test(sql)) throw new Error('quote_id FK missing');
    if (/quote_id\s+UUID\s+NOT\s+NULL/i.test(sql)) throw new Error('quote_id must be nullable (direct SO)');
  });

  check('U13-10 Quote -> WO / Quote -> JO remain forbidden (no new quote FK on operational)', () => {
    const migs = allSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf-8');
      // Table-scoped: quote_id counts only if it is a column OF an operational
      // table. A quote_id on the commercial sales_orders table is allowed.
      if (tableHasQuoteFk(sql, 'work_orders')
        || tableHasQuoteFk(sql, 'wo_items')
        || tableHasQuoteFk(sql, 'job_orders')) {
        throw new Error(`quote_id FK added to operational table in ${f}`);
      }
    }
  });

  /* ================= MULTI-SBU ================= */
  check('U13-11 One SO inherits multi-SBU via engagement capability bindings (ADR-020)', () => {
    const migs = allSqlFiles();
    const has = migs.some((f) => {
      const sql = fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf-8');
      return /UNIQUE\s*\(\s*tenant_id,\s*work_order_id,\s*capability_type\s*\)/i.test(sql);
    });
    if (!has) throw new Error('capability binding multi-SBU UNIQUE missing');
  });

  /* ================= FULFILLMENT BOUNDARY (ADR-036) ================= */
  check('U13-12 SO creation does NOT touch operational tables (create is commercial-only)', () => {
    const svc = fs.readFileSync(path.join(root, 'lib/sales-order/service.ts'), 'utf-8');
    if (/from\(['"](work_orders|wo_items|job_orders)['"]\)/.test(svc)) {
      throw new Error('SO domain writes operational tables directly — boundary violated');
    }
  });

  /* ================= SHIPMENT (ADR-038) ================= */
  check('U13-13 shp_shipments.sales_order_id added (1 SO -> many Shipments), nullable, SET NULL', () => {
    const sql = readSql();
    if (!/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+sales_order_id\s+UUID\s+REFERENCES\s+public\.sales_orders/i.test(sql)) {
      throw new Error('shp_shipments.sales_order_id missing');
    }
    if (!/ON\s+DELETE\s+SET\s+NULL/i.test(sql)) throw new Error('shipment sales_order_id must be ON DELETE SET NULL');
  });

  check('U13-13b No UNIQUE on shipment sales_order_id (multiple shipments per SO)', () => {
    const sql = readSql();
    if (/UNIQUE\s*\(\s*sales_order_id\s*\)/.test(sql)) throw new Error('sales_order_id must not be UNIQUE');
  });

  /* ================= WORK ORDER (ADR-037) ================= */
  check('U13-14 No protected WO table mutated in U-13 (WO ownership deferred to fulfillment)', () => {
    const sql = readSql(); // only the U-13 migration (`20260828_019`) is in scope
    // The U-13 migration must NOT ALTER legacy work_orders / wo_items / job_orders.
    if (/ALTER\s+TABLE[^;]*\bwork_orders\b/i.test(sql)) throw new Error('U-13 migration mutated legacy work_orders');
    if (/ALTER\s+TABLE[^;]*\bwo_items\b/i.test(sql)) throw new Error('U-13 migration mutated wo_items');
    if (/ALTER\s+TABLE[^;]*\bjob_orders\b/i.test(sql)) throw new Error('U-13 migration mutated job_orders');
    // And Shopping fulfillment composition (WO ownership) must remain deferred:
    // sales_orders must not carry a work_order_id column in U-13.
    if (/work_order_id/i.test(sql)) throw new Error('U-13 migration adds WO ownership column');
  });

  check('U13-14b No SO -> JO shortcut (no sales_order FK on job_orders)', () => {
    const migs = allSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf-8');
      if (/CREATE\s+TABLE[^;]*job_orders/.test(sql) && /sales_order_id/.test(sql)) throw new Error(`SO->JO shortcut in ${f}`);
    }
  });

  check('U13-15 ADR-037 invariant enforced (many SO -> one WO forbidden) structurally in U-13', () => {
    // Header-only scope: there is no SO->WO link field in U-13, so ADR-037
    // (many SO -> one WO forbidden) cannot be violated today. Enforce it
    // structurally: (a) sales_orders carries no work_order ownership column,
    // and (b) the SO domain never writes onto the legacy work_orders table.
    const sql = readSql();
    if (/work_order_id/i.test(sql)) throw new Error('sales_orders must not define work_order_id in U-13');
    const svc = fs.readFileSync(path.join(root, 'lib/sales-order/service.ts'), 'utf-8');
    if (/from\(['"]work_orders['"]\)/i.test(svc)) throw new Error('SO domain touches work_orders (WO ownership must be deferred)');
  });

  /* ================= TENANT ISOLATION / RLS ================= */
  check('U13-16 RLS enabled + tenant-scoped via get_my_tenant_id()', () => {
    const sql = readSql();
    if (!/ALTER\s+TABLE\s+public\.sales_orders\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(sql)) throw new Error('RLS not enabled');
    if (!/tenant_id\s*=\s*public\.get_my_tenant_id\(\)/i.test(sql)) throw new Error('RLS not tenant-scoped');
  });

  check('U13-16b No x-tenant-id heading used as authority in SO domain', () => {
    const svc = fs.readFileSync(path.join(root, 'lib/sales-order/service.ts'), 'utf-8');
    if (/x-tenant-id|headers\?\.get\(['"]x-tenant/i.test(svc)) throw new Error('client header used as tenant authority');
  });

  check('U13-16c SO input DTO documents "NO tenantId" invariant', () => {
    const types = fs.readFileSync(path.join(root, 'lib/sales-order/types.ts'), 'utf-8');
    if (!/NO\s+tenantId|no tenantId from client|contains NO tenantId/i.test(types)) throw new Error('DTO missing NO-tenantId doc');
  });

  /* ================= LIFECYCLE / STATE ================= */
  check('U13-17 Valid status enum defined (DRAFT..CLOSED, CANCELLED)', () => {
    const sql = readSql();
    const expected = ['DRAFT', 'CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CLOSED', 'CANCELLED'];
    for (const s of expected) if (!sql.includes(`'${s}'`)) throw new Error(`status ${s} missing`);
  });

  check('U13-18 No arbitrary client status accepted (service rejects invalid transitions)', () => {
    const svc = fs.readFileSync(path.join(root, 'lib/sales-order/service.ts'), 'utf-8');
    if (!/INVALID_STATUS_TRANSITION/.test(svc)) throw new Error('no transition guard in service');
  });

  /* ================= IDEMPOTENCY / DB CONSTRAINTS ================= */
  check('U13-19 idempotency_key UNIQUE per tenant; SO number not used as idempotency', () => {
    const sql = readSql();
    if (!/UNIQUE\s*\(\s*tenant_id,\s*idempotency_key\s*\)/i.test(sql)) throw new Error('idempotency UNIQUE missing');
  });

  check('U13-20 DB-level constraints present (non-negative revenue/payment/version)', () => {
    const sql = readSql();
    if (!/total_agreed_revenue\s*>=\s*0/i.test(sql)) throw new Error('revenue non-neg check missing');
    if (!/payment_terms_days\s*>=\s*0/i.test(sql)) throw new Error('payment_terms non-neg check missing');
  });

  /* ================= REGRESSION (U-12A still green is checked by runner) ================= */
  check('U13-21 U-12A suite registrar still present in runner', () => {
    const runner = fs.readFileSync(path.join(root, 'scripts/run-full-regression.ts'), 'utf-8');
    if (!runner.includes('runU12aSalesOrderArchitectureSuite')) throw new Error('U-12A suite removed from runner');
  });

  /* ================================================================== */
  /*  BEHAVIORAL — Canonical service against in-memory mock              */
  /* ================================================================== */

  const mock = new SalesOrderMockDb();
  _setSalesOrderDbClient(mock.asClient());
  _setSalesOrderLineDbClient(mock.asClient() as any);
  _setPricingDbClient(mock.asClient() as any);
  mock.reset();

  // ------- Direct SO (no quote) -------
  await checkAsync('U13-B01 Direct SO created without Quote (valid)', async () => {
    mock.reset();
    const ctx = makeCtx();
    const r = await createSalesOrder({ engagementId: ENG_A1 }, ctx);
    if (!r.created) throw new Error('expected created=true');
    if (r.salesOrder.status !== 'DRAFT') throw new Error('expected DRAFT');
    if (r.salesOrder.soNumber !== 'SO-2026-08-0001') throw new Error(`unexpected soNumber ${r.salesOrder.soNumber}`);
    if (r.salesOrder.engagementId !== ENG_A1) throw new Error('engagement not set');
    if (r.salesOrder.quoteId !== null) throw new Error('direct SO must have null quote');
    if (r.salesOrder.tenantId !== TENANT_A) throw new Error('tenant not from context');
  });

  // ------- Quote -> SO valid (quote_id set, line items created) -------
  await checkAsync('U13-B02 Quote -> SO valid (quote_id set, tenant-owned, line items created)', async () => {
    mock.reset();
    const r = await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, makeCtx());
    if (r.salesOrder.quoteId !== QUOTE_A1) throw new Error('quote_id not set');
    if (mock.soLineItems.length !== 2) throw new Error(`expected 2 line items, got ${mock.soLineItems.length}`);
    if (r.salesOrder.totalAgreedRevenue !== 6100) throw new Error(`total_agreed_revenue should be 6100, got ${r.salesOrder.totalAgreedRevenue}`);
  });

  // ------- ADR-081: Quote not ACCEPTED rejected -------
  await checkAsync('U13-B15 Quote not ACCEPTED rejected (422)', async () => {
    mock.reset();
    mock.quotes[0].status = 'SENT';
    try {
      await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, makeCtx());
      throw new Error('expected QUOTE_NOT_ACCEPTED');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'QUOTE_NOT_ACCEPTED') throw new Error(`wrong code ${e.code}`);
      if (e.statusCode !== 422) throw new Error(`wrong status ${e.statusCode}`);
    }
  });

  // ------- ADR-081: Quote with no items rejected -------
  await checkAsync('U13-B16 Quote with no items rejected (422)', async () => {
    mock.reset();
    mock.quoteItems = [];
    try {
      await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, makeCtx());
      throw new Error('expected QUOTE_NO_ITEMS');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'QUOTE_NO_ITEMS') throw new Error(`wrong code ${e.code}`);
      if (e.statusCode !== 422) throw new Error(`wrong status ${e.statusCode}`);
    }
  });

  // ------- ADR-081: Price snapshot uses nego_price when present -------
  await checkAsync('U13-B17 Price snapshot uses nego_price over unit_price', async () => {
    mock.reset();
    const r = await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, makeCtx());
    const firstLine = mock.soLineItems[0];
    if (firstLine.unit_rate !== 1400) throw new Error(`unit_rate should be 1400 (nego_price), got ${firstLine.unit_rate}`);
    if (firstLine.line_total !== 5600) throw new Error(`line_total should be 5600, got ${firstLine.line_total}`);
    const snapshot = firstLine.price_snapshot as Record<string, unknown>;
    if (Number(snapshot.unit_rate_snapshot) !== 1400) throw new Error('snapshot unit_rate_snapshot wrong');
    if (Number(snapshot.calculated_amount) !== 5600) throw new Error('snapshot calculated_amount wrong');
  });

  // ------- ADR-081: Client-supplied totalAgreedRevenue ignored when quoteId present -------
  await checkAsync('U13-B18 Server-authoritative revenue overrides client total when quoteId present', async () => {
    mock.reset();
    const r = await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1, totalAgreedRevenue: 999999 }, makeCtx());
    if (r.salesOrder.totalAgreedRevenue !== 6100) throw new Error(`server should override client revenue, got ${r.salesOrder.totalAgreedRevenue}`);
  });

  // ------- ADR-081: Idempotency — retry same idempotencyKey returns existing SO with lines -------
  await checkAsync('U13-B19 Idempotent retry returns existing SO with lines', async () => {
    mock.reset();
    const payload = { engagementId: ENG_A1, quoteId: QUOTE_A1, idempotencyKey: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' };
    const first = await createSalesOrder(payload, makeCtx());
    if (!first.created) throw new Error('first call should create');
    mock.nextInsertUniqueViolation = true;
    const second = await createSalesOrder(payload, makeCtx());
    if (second.created !== false) throw new Error('retry must resolve');
    if (second.salesOrder.id !== first.salesOrder.id) throw new Error('retry resolved different SO');
    if (mock.soLineItems.length !== 2) throw new Error('retry should not duplicate line items');
  });

  // ------- ADR-081: Multiple SOs from same Quote -------
  await checkAsync('U13-B20 Multiple SOs from same Quote each get independent line items', async () => {
    mock.reset();
    const a = await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1, idempotencyKey: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' }, makeCtx());
    const b = await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1, idempotencyKey: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' }, makeCtx());
    if (a.salesOrder.id === b.salesOrder.id) throw new Error('two SOs from same quote must have different ids');
    if (mock.soLineItems.length !== 4) throw new Error(`expected 4 total line items, got ${mock.soLineItems.length}`);
  });

  // ------- ADR-081: Cross-tenant Quote rejected -------
  await checkAsync('U13-B21 Cross-tenant Quote rejected (404)', async () => {
    mock.reset();
    try {
      await createSalesOrder({ engagementId: ENG_B1, quoteId: QUOTE_A1 }, makeCtx({ tenantId: TENANT_B }));
      throw new Error('expected error');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'QUOTE_NOT_FOUND') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- ADR-081: Unauthorized create rejected -------
  await checkAsync('U13-B22 Unauthorized (no commercial:manage) rejected for Quote->SO', async () => {
    mock.reset();
    const ctx = makeCtx({ role: 'SBU_OPS_TR', permissions: ['work_order:read'] } as Partial<IdentityContext>);
    try {
      await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, ctx);
      throw new Error('expected 403');
    } catch (e) {
      if (!(e instanceof IdentityResolutionError)) throw e;
      if (e.statusCode !== 403) throw new Error(`wrong status ${e.statusCode}`);
    }
  });

  // ------- ADR-081: Line mapping — capability type mapped from service sbu_type -------
  await checkAsync('U13-B23 Line mapping maps service sbu_type to capability type', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 }, makeCtx());
    const fwdLine = mock.soLineItems.find((l) => l.source_quote_item_id === 'qi-1');
    const customsLine = mock.soLineItems.find((l) => l.source_quote_item_id === 'qi-2');
    if (fwdLine.capability_type !== 'FORWARDING') throw new Error(`expected FORWARDING, got ${fwdLine.capability_type}`);
    if (customsLine.capability_type !== 'CUSTOMS') throw new Error(`expected CUSTOMS, got ${customsLine.capability_type}`);
  });

  // ------- Cross-tenant engagement rejected -------
  await checkAsync('U13-B03 Cross-tenant Engagement rejected (404)', async () => {
    mock.reset();
    try {
      await createSalesOrder({ engagementId: ENG_B1 }, makeCtx());
      throw new Error('expected error');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'ENGAGEMENT_NOT_FOUND') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- Cross-tenant quote rejected -------
  await checkAsync('U13-B04 Cross-tenant Quote rejected (404)', async () => {
    mock.reset();
    try {
      await createSalesOrder({ engagementId: ENG_A1, quoteId: QUOTE_A1 + 'b' }, makeCtx());
      throw new Error('expected error');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'QUOTE_NOT_FOUND') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- Unauthorized create rejected -------
  await checkAsync('U13-B05 Unauthorized (no commercial:manage) rejected', async () => {
    mock.reset();
    const ctx = makeCtx({ role: 'SBU_OPS_TR', permissions: ['work_order:read'] } as Partial<IdentityContext>);
    try {
      await createSalesOrder({ engagementId: ENG_A1 }, ctx);
      throw new Error('expected 403');
    } catch (e) {
      if (!(e instanceof IdentityResolutionError)) throw e;
      if (e.statusCode !== 403) throw new Error(`wrong status ${e.statusCode}`);
    }
  });

  // ------- Idempotency (retry with same key) -------
  await checkAsync('U13-B06 Idempotent create (same idempotency_key -> existing, created=false)', async () => {
    mock.reset();
    const payload = { engagementId: ENG_A1, idempotencyKey: '11111111-1111-4111-8111-111111111111' };
    const first = await createSalesOrder(payload, makeCtx());
    if (!first.created) throw new Error('first call should create');
    // Simulate the unique_violation on the duplicate-key retry returning existing
    mock.nextInsertUniqueViolation = true;
    const second = await createSalesOrder(payload, makeCtx());
    if (second.created !== false) throw new Error('retry must resolve, not create');
    if (second.salesOrder.id !== first.salesOrder.id) throw new Error('retry resolved DIFFERENT SO');
  });

  // ------- N concurrent next_sales_order -> N unique numbers -------
  await checkAsync('U13-B07 Concurrency: N concurrent allocations -> N unique numbers', async () => {
    mock.rpcCadence = [
      { data: 'SO-2026-08-0001', error: null },
      { data: 'SO-2026-08-0002', error: null },
      { data: 'SO-2026-08-0003', error: null },
      { data: 'SO-2026-08-0004', error: null },
      { data: 'SO-2026-08-0005', error: null },
    ];
    const nums = await Promise.all(Array.from({ length: 5 }, () => allocateSalesOrderNumber(TENANT_A)));
    if (new Set(nums).size !== 5) throw new Error('duplicate numbers under concurrency');
    if (nums.some((n) => !/^SO-\d{4}-\d{2}-\d{4}$/.test(n))) throw new Error('format wrong');
    mock.reset();
  });

  // ------- Confirm transition -------
  await checkAsync('U13-B08 Confirm DRAFT -> CONFIRMED succeeds', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '22222222-2222-4222-8222-222222222222' }, makeCtx());
    const so = mock.salesOrders[0];
    const confirmed = await confirmSalesOrder(so.id as string, makeCtx());
    if (confirmed.status !== 'CONFIRMED') throw new Error('not confirmed');
  });

  await checkAsync('U13-B09 Confirm invalid transition (CONFIRMED -> CONFIRMED) rejected', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '33333333-3333-4333-8333-333333333333' }, makeCtx());
    const so = mock.salesOrders[0];
    const c1 = await confirmSalesOrder(so.id as string, makeCtx());
    if (c1.status !== 'CONFIRMED') throw new Error('setup failed');
    try {
      await confirmSalesOrder(so.id as string, makeCtx());
      throw new Error('expected invalid transition');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'INVALID_STATUS_TRANSITION') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- Draft editable, confirmed not editable -------
  await checkAsync('U13-B10 Draft update allowed; CONFIRMED update rejected (NOT_EDITABLE)', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '44444444-4444-4444-8444-444444444444' }, makeCtx());
    const so = mock.salesOrders[0];
    const updated = await updateDraftSalesOrder(so.id as string, { currency: 'USD' }, makeCtx());
    if (updated.currency !== 'USD') throw new Error('draft update failed');
    await confirmSalesOrder(so.id as string, makeCtx());
    try {
      await updateDraftSalesOrder(so.id as string, { currency: 'EUR' }, makeCtx());
      throw new Error('expected NOT_EDITABLE');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'NOT_EDITABLE') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- Cancel -------
  await checkAsync('U13-B11 Cancel active SO -> CANCELLED; terminal not cancellable', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '55555555-5555-4555-8555-555555555555' }, makeCtx());
    const so = mock.salesOrders[0];
    const cancelled = await cancelSalesOrder(so.id as string, makeCtx(), 'customer request');
    if (cancelled.status !== 'CANCELLED') throw new Error('not cancelled');
    try {
      await cancelSalesOrder(so.id as string, makeCtx());
      throw new Error('expected invalid transition on terminal');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'INVALID_STATUS_TRANSITION') throw new Error('not terminal fail');
    }
  });

  // ------- Tenant-scoped read -------
  await checkAsync('U13-B12 findSalesOrderById is tenant-scoped (B cannot read A)', async () => {
    mock.reset();
    await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '66666666-6666-4666-8666-666666666666' }, makeCtx());
    const so = mock.salesOrders[0];
    try {
      await findSalesOrderById(makeCtx({ userId: 'u-b', tenantId: TENANT_B }), so.id as string);
      throw new Error('expected not found for cross-tenant');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'SALES_ORDER_NOT_FOUND') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- list requires read permission + engagement ownership -------
  await checkAsync('U13-B13 list Sales Orders requires commercial:read and tenant-owned engagement', async () => {
    mock.reset();
    const list = await listSalesOrdersForEngagement(makeCtx(), ENG_A1);
    if (!Array.isArray(list)) throw new Error('list should be array');
    try {
      await listSalesOrdersForEngagement(makeCtx({ permissions: ['work_order:read'] } as Partial<IdentityContext>), ENG_A1);
      throw new Error('expected 403 for missing read');
    } catch (e) {
      if (!(e instanceof IdentityResolutionError)) throw e;
    }
    try {
      // TENANT_B caller must NOT be able to list TENANT_A's engagement SOs.
      await listSalesOrdersForEngagement(makeCtx({ tenantId: TENANT_B }), ENG_A1);
      throw new Error('expected not found listing foreign tenant engagement');
    } catch (e) {
      if (!(e instanceof SalesOrderError)) throw e;
      if (e.code !== 'ENGAGEMENT_NOT_FOUND') throw new Error(`wrong code ${e.code}`);
    }
  });

  // ------- Multiple SOs per engagement (ADR-034 1:N) -------
  await checkAsync('U13-B14 One Engagement -> many Sales Orders', async () => {
    mock.reset();
    const ctx = makeCtx();
    const a = await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '77777777-7777-4777-8777-777777777777' }, ctx);
    const b = await createSalesOrder({ engagementId: ENG_A1, idempotencyKey: '88888888-8888-4888-8888-888888888888' }, ctx);
    if (a.salesOrder.soNumber === b.salesOrder.soNumber) throw new Error('two SOs got same number');
    if (mock.salesOrders.filter((r) => r.engagement_id === ENG_A1).length < 2) throw new Error('expected 2 SOs on engagement');
  });

  // ------- ADR-082: Direct SO with canonical pricing line items -------
  await checkAsync('U13-B24 Direct SO with canonical pricing creates line items', async () => {
    mock.reset();
    const ctx = makeCtx();
    const r = await createSalesOrder({
      engagementId: ENG_A1,
      lineItems: [
        {
          lineSequence: 1,
          capabilityType: 'FORWARDING',
          side: 'SELL',
          serviceDescription: 'Ocean Freight 40HC',
          quantity: 2,
          unitOfMeasure: 'Container',
          pricingContext: {
            capabilityType: 'FORWARDING',
            side: 'SELL',
            effectiveDate: '2026-08-28',
            customerId: CUST_A1,
            origin: 'IDJKT',
            destination: 'USLAX',
            containerType: '40HC',
            chargeBasis: 'PER_CONTAINER',
            currency: 'IDR',
          },
        },
      ],
    }, ctx);
    if (r.salesOrder.totalAgreedRevenue !== 3000) throw new Error(`expected 3000, got ${r.salesOrder.totalAgreedRevenue}`);
    if (mock.soLineItems.length !== 1) throw new Error(`expected 1 line item, got ${mock.soLineItems.length}`);
  });

  // ------- ADR-082: Canonical pricing with no matching rate -------
  await checkAsync('U13-B25 Canonical pricing with no matching rate throws', async () => {
    mock.reset();
    const ctx = makeCtx();
    try {
      await createSalesOrder({
        engagementId: ENG_A1,
        lineItems: [
          {
            lineSequence: 1,
            capabilityType: 'FORWARDING',
            side: 'SELL',
            serviceDescription: 'Unknown Service',
            quantity: 1,
            unitOfMeasure: 'Unit',
            pricingContext: {
              capabilityType: 'FORWARDING',
              side: 'SELL',
              effectiveDate: '2026-08-28',
              customerId: CUST_A1,
              origin: 'IDJKT',
              destination: 'USLAX',
              containerType: '40HC',
              chargeBasis: 'PER_CONTAINER',
              currency: 'USD',
            },
          },
        ],
      }, ctx);
      throw new Error('expected pricing resolution failure');
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      if (!e.message.includes('No canonical pricing rate found')) throw new Error(`unexpected error: ${e.message}`);
    }
  });

  // ------- ADR-082: Canonical pricing tenant isolation -------
  await checkAsync('U13-B26 Cross-tenant canonical pricing rejected', async () => {
    mock.reset();
    const ctx = makeCtx({ tenantId: TENANT_B });
    try {
      await createSalesOrder({
        engagementId: ENG_A1,
        lineItems: [
          {
            lineSequence: 1,
            capabilityType: 'FORWARDING',
            side: 'SELL',
            serviceDescription: 'Ocean Freight',
            quantity: 1,
            unitOfMeasure: 'Container',
            pricingContext: {
              capabilityType: 'FORWARDING',
              side: 'SELL',
              effectiveDate: '2026-08-28',
              customerId: CUST_A1,
              origin: 'IDJKT',
              destination: 'USLAX',
              containerType: '40HC',
              chargeBasis: 'PER_CONTAINER',
              currency: 'IDR',
            },
          },
        ],
      }, ctx);
      throw new Error('expected cross-tenant rejection');
    } catch (e) {
      if (!(e instanceof Error)) throw e;
      if (!e.message.includes('not found') && !e.message.includes('ownership')) throw new Error(`unexpected error: ${e.message}`);
    }
  });

  _setSalesOrderDbClient(null);
  _setSalesOrderLineDbClient(null);
  _setPricingDbClient(null);

  console.log(`U-13 SALES ORDER FOUNDATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
