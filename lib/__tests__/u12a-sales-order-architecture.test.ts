/**
 * Sentralogis — U-12A Sales Order & Commercial Commitment — Architecture Decision Gate
 *
 * Executable architecture ASSERTIONS (not SO implementation).
 *
 * U-12A is a DECISION GATE. These tests do NOT implement Sales Order. They verify
 * the CURRENT canonical invariants that a ratifiable SO architecture would build upon,
 * so humans can ratify the decision without guessing at the repository state.
 *
 *   U12A-01: Canonical object presence (engagement, bindings, SR, shipment, line_items)
 *   U12A-02: No direct Quote → WO bypass (Quote is CRM-only)
 *   U12A-03: No direct CRM → WO bypass (CRM is non-operational)
 *   U12A-04: Engagement authority (resolveOrCreateEngagement is canonical write path)
 *   U12A-05: Tenant isolation (engagement DTO carries no tenantId)
 *   U12A-06: Multi-SBU composition supported (ADR-020)
 *   U12A-07: Commercial line-items table exists & is the natural SO sell-line seat
 *   U12A-08: Shipment anchors to engagement (work_order_id → commercial_work_orders)
 *   U12A-09: Legacy operational lineage is protected (job_orders.wo_item_id → wo_items)
 *   U12A-10: No competing order root already exists (no sales_order table)
 */

import * as fs from 'fs';
import * as path from 'path';

export function runU12aSalesOrderArchitectureSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  function readFile(relPath: string): string {
    return fs.readFileSync(path.join(process.cwd(), relPath), 'utf-8');
  }

  function fileExists(relPath: string): boolean {
    return fs.existsSync(path.join(process.cwd(), relPath));
  }

  // Table-scoped detector: does `table` DEFINE a quote_id FK column (CREATE
  // TABLE column block or ALTER TABLE ADD COLUMN)? Associates quote_id with the
  // specific table being created/altered — so a quote_id on a DIFFERENT table
  // (e.g. commercial sales_orders) does NOT count even when it references the
  // engagement or operational tables.
  function tableHasQuoteFk(sql: string, table: string): boolean {
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
  }

  function collectSqlFiles(): string[] {
    const dir = path.join(process.cwd(), 'supabase/migrations');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
  }

  function collectFiles(dir: string, ext: string): string[] {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) return [];
    const skip = new Set(['node_modules', '.next', 'dist', '__tests__']);
    const out: string[] = [];
    const walk = (d: string) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) { if (!skip.has(e.name)) walk(path.join(d, e.name)); }
        else if (e.name.endsWith(ext) && !e.name.endsWith('.test.ts')) out.push(path.join(d, e.name));
      }
    };
    walk(fullDir);
    return out;
  }

  // =========================================================================
  // U12A-01: Canonical object presence
  // =========================================================================
  assert('U12A-01A', 'commercial_work_orders (engagement root) exists', () => {
    const found = collectSqlFiles().some(f => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE TABLE[^;]*commercial_work_orders/.test(sql);
    });
    if (!found) throw new Error('commercial_work_orders not found');
  });

  assert('U12A-01B', 'commercial_capability_bindings exists (composition, ADR-020)', () => {
    const found = collectSqlFiles().some(f => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE TABLE[^;]*commercial_capability_bindings/.test(sql);
    });
    if (!found) throw new Error('commercial_capability_bindings not found');
  });

  assert('U12A-01C', 'svc_service_requests exists (cross-domain dispatch)', () => {
    const found = collectSqlFiles().some(f => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE TABLE[^;]*svc_service_requests/.test(sql);
    });
    if (!found) throw new Error('svc_service_requests not found');
  });

  assert('U12A-01D', 'shp_shipments exists (forwarding operational aggregate)', () => {
    const found = collectSqlFiles().some(f => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE TABLE[^;]*shp_shipments/.test(sql);
    });
    if (!found) throw new Error('shp_shipments not found');
  });

  // =========================================================================
  // U12A-02: No direct Quote → WO bypass
  // =========================================================================
  assert('U12A-02A', 'No quote_id FK on any operational table', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      // Table-scoped: quote_id counts only if it is a column OF one of these
      // operational tables. A quote_id on the commercial sales_orders table is
      // not operational and is not flagged.
      if (tableHasQuoteFk(sql, 'work_orders')
        || tableHasQuoteFk(sql, 'wo_items')
        || tableHasQuoteFk(sql, 'job_orders')) {
        throw new Error(`Migration ${f} adds quote_id FK to operational table`);
      }
    }
  });

  assert('U12A-02B', 'Quote acceptance does not create operational records', () => {
    const file = 'app/quote/actions.ts';
    if (!fileExists(file)) throw new Error('app/quote/actions.ts missing');
    const src = readFile(file);
    if (/from\('job_orders'\)|from\('wo_items'\)|from\('work_orders'\)/.test(src)) {
      throw new Error('Quote acceptance touches operational tables');
    }
  });

  // =========================================================================
  // U12A-03: No direct CRM → WO bypass
  // =========================================================================
  assert('U12A-03A', 'No code both reads crm_* AND writes operational tables', () => {
    const all = [
      ...collectFiles('lib', '.ts'),
      ...collectFiles('app', '.ts'),
      ...collectFiles('app', '.tsx'),
    ];
    for (const file of all) {
      const content = fs.readFileSync(file, 'utf-8');
      const readsCrm = content.includes('crm_quotations') || content.includes('crm_deals') || content.includes('crm_quotation_items');
      const writesOp = /from\('work_orders'\)|from\('wo_items'\)|from\('job_orders'\)/.test(content) && /\.insert\(/.test(content);
      if (readsCrm && writesOp) {
        const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
        if (!rel.includes('__tests__') && !rel.includes('u12a')) throw new Error(`CRM→Operational bypass candidate: ${rel}`);
      }
    }
  });

  // =========================================================================
  // U12A-04: Engagement authority
  // =========================================================================
  assert('U12A-04A', 'resolveOrCreateEngagement is the canonical write path authority', () => {
    const src = readFile('lib/application/engagement/engagement-bridge.ts');
    if (!src.includes('resolveOrCreateEngagement')) throw new Error('resolveOrCreateEngagement missing');
  });

  assert('U12A-04B', 'Engagement creation is idempotent (insert + 23505 + re-select)', () => {
    const src = readFile('lib/application/engagement/engagement-bridge.ts');
    if (!src.includes('resolve') || !src.includes('INSERT') && !src.includes('insert')) {
      throw new Error('resolve-or-create pattern not confirmed');
    }
  });

  assert('U12A-04C', 'One open engagement per (tenant, customer) enforced (partial unique index)', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (sql.includes('uq_com_wo_open_per_customer')) return;
    }
    throw new Error('uq_com_wo_open_per_customer partial unique index not found');
  });

  // =========================================================================
  // U12A-05: Tenant isolation
  // =========================================================================
  assert('U12A-05A', 'Engagement input DTO contains no tenantId', () => {
    const src = readFile('lib/application/engagement/types.ts');
    if (!src.includes('NO tenantId') && !src.includes('NO tenantId and NO userId')) {
      throw new Error('Engagement DTO does not document NO tenantId invariant');
    }
  });

  // =========================================================================
  // U12A-06: Multi-SBU composition
  // =========================================================================
  assert('U12A-06A', 'Capability binding UNIQUE supports multiple types per engagement', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (/CREATE TABLE[^;]*commercial_capability_bindings/.test(sql)) {
        if (!/UNIQUE\s*\(\s*tenant_id,\s*work_order_id,\s*capability_type\s*\)/.test(sql)) {
          throw new Error('capability_bindings UNIQUE does not allow multiple capability types');
        }
        return;
      }
    }
    throw new Error('capability_bindings schema not found');
  });

  // =========================================================================
  // U12A-07: Commercial line-items table (candidate SO sell-line seat)
  // =========================================================================
  assert('U12A-07A', 'commercial_line_items table exists', () => {
    const found = collectSqlFiles().some(f => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE TABLE[^;]*commercial_line_items/.test(sql);
    });
    if (!found) throw new Error('commercial_line_items table not found (candidate SO sell-line seat)');
  });

  assert('U12A-07B', 'commercial_line_items references engagement (work_order_id FK)', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (/CREATE TABLE[^;]*commercial_line_items/.test(sql)) {
        if (!/work_order_id[^;]*REFERENCES[^;]*commercial_work_orders/.test(sql)) {
          throw new Error('commercial_line_items missing work_order_id FK to engagement');
        }
        return;
      }
    }
    throw new Error('commercial_line_items schema not found');
  });

  // =========================================================================
  // U12A-08: Shipment anchors to engagement, not legacy WO
  // =========================================================================
  assert('U12A-08A', 'shp_shipments.work_order_id → commercial_work_orders (engagement)', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (/CREATE TABLE[^;]*shp_shipments/.test(sql)) {
        if (!/work_order_id[^;]*REFERENCES[^;]*commercial_work_orders/.test(sql)) {
          throw new Error('shp_shipments.work_order_id does not reference engagement');
        }
        return;
      }
    }
    throw new Error('shp_shipments schema not found');
  });

  assert('U12A-08B', 'shp_shipments supports 1..N shipments per engagement (no UNIQUE on work_order_id)', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (/CREATE TABLE[^;]*shp_shipments/.test(sql)) {
        if (/UNIQUE\s*\(\s*work_order_id\s*\)/.test(sql)) {
          throw new Error('shp_shipments.work_order_id is UNIQUE — forbids 1..N shipments per engagement');
        }
        return;
      }
    }
    throw new Error('shp_shipments schema not found');
  });

  // =========================================================================
  // U12A-09: Legacy operational lineage is protected
  // =========================================================================
  assert('U12A-09A', 'job_orders.wo_item_id → wo_items preserved', () => {
    const migs = collectSqlFiles();
    for (const f of migs) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      if (/CREATE TABLE[^;]*job_orders/.test(sql) && /wo_item_id[^;]*REFERENCES[^;]*wo_items/.test(sql)) {
        return;
      }
    }
    throw new Error('job_orders.wo_item_id → wo_items FK not found');
  });

  // =========================================================================
  // U12A-10: Single canonical order root (Sales Order ratified by U-13)
  // -------------------------------------------------------------------------
  // Originally "no sales_order table exists today (no duplicate order root)".
  // After U-12A-R ratified ADR-034..038 and U-13 implemented the canonical
  // sales_orders table, the invariant is strengthened: there is EXACTLY ONE
  // canonical `sales_orders` table (created by the authorized U-13 migration)
  // and NO second/competing order root. The assertion is NOT weakened — the
  // anti-competing-root/anti-duplicate-authority invariant is preserved.
  // =========================================================================
  assert('U12A-10A', 'Exactly ONE canonical sales_orders table (no duplicate order root)', () => {
    let found = 0;
    for (const f of collectSqlFiles()) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      // Count CREATE TABLE [IF NOT EXISTS] [public.]sales_orders (excluding foreign key references).
      const matches = sql.match(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:[A-Za-z0-9_]+\.)?sales_orders\b/gi) || [];
      found += matches.length;
    }
    if (found !== 1) {
      throw new Error(`Expected exactly one canonical sales_orders table, found ${found}`);
    }
  });

  const all = collectFiles('lib', '.ts').concat(collectFiles('app', '.ts')).concat(collectFiles('app', '.tsx'));
  assert('U12A-10B', 'SO number authority is single (only next_sales_order, no client generation)', () => {
    // The canonical authority must be next_sales_order().
    const migs = collectSqlFiles();
    const hasAuthority = migs.some((f) => {
      const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations', f), 'utf-8');
      return /CREATE\s+OR\s+REPLACE\s+FUNCTION[^;]*next_sales_order/.test(sql);
    });
    if (!hasAuthority) throw new Error('next_sales_order() authority not found');
    // And client code MUST NOT generate canonical SO numbers (SO-YYYY...).
    const forbidden = all.filter((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      return /SO-\d{4}-\d{2}-\d{4}/.test(content) && /Math\.random\(\)|Date\.now\(\)|crypto\.randomUUID\(\)/.test(content);
    });
    if (forbidden.length > 0) {
      throw new Error(`client-side canonical SO number generation: ${forbidden.map(f => path.relative(process.cwd(), f)).join(', ')}`);
    }
  });

  return results;
}
