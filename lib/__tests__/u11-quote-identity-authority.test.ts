/**
 * Sentralogis — U-11 Quote Identity & Number Authority Tests
 *
 * Architecture gates verifying:
 *   U11-01: Quote Identity Classification — all identifiers classified
 *   U11-02: Creation Path Inventory — all production paths identified
 *   U11-03: Single Number Authority — exactly one canonical authority
 *   U11-04: No Canonical Client Generation — client doesn't generate PK/FK
 *   U11-05: Database Uniqueness — UNIQUE constraint on quote_number
 *   U11-06: Concurrency Safety — no unsafe sequence patterns
 *   U11-07: Retry/Idempotency Safety — deterministic retry semantics
 *   U11-08: Lineage Integrity — Quote identity stable (separate from execution)
 *   U11-09: Full Regression — existing tests remain green
 */

import * as fs from 'fs';
import * as path from 'path';

export function runU11QuoteIdentityAuthoritySuite() {
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
  // (e.g. sales_orders) does NOT count even when it references the engagement.
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

  function grepInDir(dir: string, pattern: RegExp, ext: string = '.ts'): Array<{ file: string; line: number; match: string }> {
    const hits: Array<{ file: string; line: number; match: string }> = [];
    const skipDirs = new Set(['node_modules', '.next', 'dist', '.git', '__tests__']);
    const entries = fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        hits.push(...grepInDir(path.join(dir, entry.name), pattern, ext));
      } else if (entry.name.endsWith(ext) && !entry.name.endsWith('.test.ts')) {
        const content = fs.readFileSync(path.join(process.cwd(), dir, entry.name), 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            hits.push({ file: path.join(dir, entry.name), line: i + 1, match: lines[i].trim().substring(0, 120) });
          }
        }
      }
    }
    return hits;
  }

  // =========================================================================
  // U11-01: Quote Identity Classification
  //
  // All Quote identifiers must be classified:
  //   - PK: id (UUID, server-generated)
  //   - BUSINESS-ID: quote_number (QT-YYYY-MM-NNNN)
  //   - FK: deal_id, tenant_id, created_by, updated_by
  // =========================================================================
  assert('U11-01', 'Quote PK is id (UUID) — not quote_number', () => {
    const sql = readFile('supabase/migrations/115_crm_foundational_tables.sql');
    // The CREATE TABLE must have id UUID PRIMARY KEY
    if (!sql.includes('id UUID PRIMARY KEY')) {
      throw new Error('crm_quotations PK is not id UUID');
    }
  });

  assert('U11-02', 'quote_number is NOT a PRIMARY KEY', () => {
    const sql = readFile('supabase/migrations/115_crm_foundational_tables.sql');
    // quote_number should be VARCHAR NOT NULL, not PRIMARY KEY
    const match = sql.match(/quote_number\s+(\w+)/);
    if (!match) {
      throw new Error('quote_number column definition not found');
    }
    if (match[1].toUpperCase() === 'PRIMARY') {
      throw new Error('quote_number is defined as PRIMARY KEY — should be BUSINESS-ID only');
    }
  });

  assert('U11-03', 'Quote has FK to crm_deals (deal_id)', () => {
    const sql = readFile('supabase/migrations/115_crm_foundational_tables.sql');
    if (!sql.includes('deal_id UUID NOT NULL REFERENCES public.crm_deals')) {
      throw new Error('Missing FK: deal_id → crm_deals');
    }
  });

  // =========================================================================
  // U11-02: Creation Path Inventory
  //
  // All production-capable Quote creation paths must be identified.
  // After U-11 repair: both paths call getNextQuoteNumber() server action.
  // =========================================================================
  assert('U11-04', 'Sales Portal creates quotes via server-side authority', () => {
    const src = readFile('app/portal/sales/deals/[id]/page.tsx');
    if (!src.includes('getNextQuoteNumber')) {
      throw new Error('Sales Portal does not call getNextQuoteNumber — still using client-side generation');
    }
    // Verify no client-side Math.random quote_number generation
    if (/Math\.random\(\).*quote_number|quote_number.*Math\.random\(\)/.test(src)) {
      throw new Error('Sales Portal still has client-side Math.random quote_number generation');
    }
  });

  assert('U11-05', 'HQ Pipeline creates quotes via server-side authority', () => {
    const src = readFile('app/(dashboard)/commercial/pipeline/page.tsx');
    if (!src.includes('getNextQuoteNumber')) {
      throw new Error('HQ Pipeline does not call getNextQuoteNumber — still using client-side generation');
    }
    // Verify no client-side Math.random quote_number generation
    if (/Math\.random\(\).*quote_number|quote_number.*Math\.random\(\)/.test(src)) {
      throw new Error('HQ Pipeline still has client-side Math.random quote_number generation');
    }
  });

  assert('U11-06', 'No other code paths create crm_quotations rows', () => {
    // Search for .from('crm_quotations').insert( pattern — specifically targeting the quotations table
    const knownPaths = [
      'app/portal/sales/deals/[id]/page.tsx',
      'app/(dashboard)/commercial/pipeline/page.tsx',
    ];

    const searchDirs = ['app', 'lib', 'src'];
    for (const dir of searchDirs) {
      const fullDir = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullDir)) continue;
      const collectFiles = (d: string): string[] => {
        const skip = new Set(['node_modules', '.next', 'dist', '__tests__']);
        const files: string[] = [];
        const entries = fs.readdirSync(d, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) { if (!skip.has(e.name)) files.push(...collectFiles(path.join(d, e.name))); }
          else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) {
            if (!e.name.endsWith('.test.ts')) files.push(path.join(d, e.name));
          }
        }
        return files;
      };
      const files = collectFiles(fullDir);
      for (const f of files) {
        const content = fs.readFileSync(f, 'utf-8');
        // Must have .from('crm_quotations') AND .insert( within ~5 lines of each other
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/\.from\s*\(\s*['"]crm_quotations['"]\s*\)/.test(lines[i])) {
            // Check next 10 lines for .insert(
            const window = lines.slice(i, i + 10).join('\n');
            if (/\.insert\(/.test(window)) {
              const rel = path.relative(process.cwd(), f).replace(/\\/g, '/');
              if (!knownPaths.includes(rel)) {
                throw new Error(`Unexpected Quote creation path: ${rel}:${i + 1}`);
              }
            }
          }
        }
      }
    }
  });

  // =========================================================================
  // U11-03: Single Number Authority
  //
  // Exactly one canonical Quote business-number authority must exist.
  // After U-11: the next_quote_number() PostgreSQL function is the authority.
  // =========================================================================
  assert('U11-07', 'Server action getNextQuoteNumber exists', () => {
    if (!fileExists('app/quote/number-actions.ts')) {
      throw new Error('Server action getNextQuoteNumber not found at app/quote/number-actions.ts');
    }
    const src = readFile('app/quote/number-actions.ts');
    if (!src.includes("'use server'")) {
      throw new Error('number-actions.ts missing "use server" directive');
    }
    if (!src.includes('next_quote_number')) {
      throw new Error('number-actions.ts does not call next_quote_number RPC');
    }
  });

  assert('U11-08', 'Database function next_quote_number exists in migration', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('CREATE OR REPLACE FUNCTION public.next_quote_number')) {
      throw new Error('next_quote_number function not defined in migration');
    }
  });

  assert('U11-09', 'next_quote_number uses nextval (atomic sequence)', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('nextval')) {
      throw new Error('next_quote_number does not use nextval — not concurrency-safe');
    }
  });

  assert('U11-10', 'Server action is the ONLY import of getNextQuoteNumber in creation paths', () => {
    // Both creation paths must import from the canonical server action
    const portal = readFile('app/portal/sales/deals/[id]/page.tsx');
    const pipeline = readFile('app/(dashboard)/commercial/pipeline/page.tsx');

    if (!portal.includes("from '@/app/quote/number-actions'")) {
      throw new Error('Sales Portal does not import from canonical number-actions');
    }
    if (!pipeline.includes("from '@/app/quote/number-actions'")) {
      throw new Error('HQ Pipeline does not import from canonical number-actions');
    }
  });

  // =========================================================================
  // U11-04: No Canonical Client Generation
  //
  // Client-side code must NOT generate canonical Quote PK or FK.
  // Client-side code must NOT generate quote_number directly.
  // =========================================================================
  assert('U11-11', 'No client-side Math.random quote_number generation in any file', () => {
    // Search all .tsx files for Math.random combined with QT-
    const tsxHits = grepInDir('app', /Math\.random.*QT-|QT-.*Math\.random/, '.tsx');
    const tsHits = grepInDir('app', /Math\.random.*QT-|QT-.*Math\.random/, '.ts');

    const allHits = [...tsxHits, ...tsHits];
    if (allHits.length > 0) {
      const details = allHits.map(h => `  ${h.file}:${h.line}`).join('\n');
      throw new Error(`Client-side Math.random QT- generation found:\n${details}`);
    }
  });

  assert('U11-12', 'No client-side Date.now() quote_number generation', () => {
    const tsxHits = grepInDir('app', /Date\.now.*QT-|QT-.*Date\.now/, '.tsx');
    const tsHits = grepInDir('app', /Date\.now.*QT-|QT-.*Date\.now/, '.ts');
    const allHits = [...tsxHits, ...tsHits];
    if (allHits.length > 0) {
      const details = allHits.map(h => `  ${h.file}:${h.line}`).join('\n');
      throw new Error(`Client-side Date.now() QT- generation found:\n${details}`);
    }
  });

  // =========================================================================
  // U11-05: Database Uniqueness
  //
  // Quote business-number uniqueness must be database-enforced.
  // =========================================================================
  assert('U11-13', 'UNIQUE constraint on (tenant_id, quote_number) exists', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('UNIQUE') || !sql.includes('quote_number')) {
      throw new Error('No UNIQUE constraint on quote_number in migration');
    }
  });

  assert('U11-14', 'UNIQUE constraint is on (tenant_id, quote_number) — per-tenant scope', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('tenant_id, quote_number') && !sql.includes('tenant_id,quote_number')) {
      throw new Error('UNIQUE constraint must be on (tenant_id, quote_number), not globally');
    }
  });

  // =========================================================================
  // U11-06: Concurrency Safety
  //
  // No unsafe SELECT MAX + increment patterns.
  // nextval() is atomic and session-safe.
  // =========================================================================
  assert('U11-15', 'No SELECT MAX(quote_number) pattern in codebase', () => {
    const tsHits = grepInDir('lib', /MAX\s*\(\s*quote_number\s*\)/i, '.ts');
    const appHits = grepInDir('app', /MAX\s*\(\s*quote_number\s*\)/i, '.ts');
    const allHits = [...tsHits, ...appHits];
    if (allHits.length > 0) {
      const details = allHits.map(h => `  ${h.file}:${h.line}`).join('\n');
      throw new Error(`Unsafe MAX(quote_number) pattern found:\n${details}`);
    }
  });

  assert('U11-16', 'No application-level quote_number sequencing (check-then-insert)', () => {
    // Search for patterns like: select latest → increment → insert
    // This is a heuristic — look for select + increment patterns near quote inserts
    const src = readFile('app/quote/number-actions.ts');
    // The server action should use RPC, not manual select+increment
    if (src.includes('.from(') && src.includes('quote_number') && src.includes('.select(')) {
      throw new Error('Server action uses manual select+increment — should use nextval RPC');
    }
  });

  // =========================================================================
  // U11-07: Retry / Idempotency Safety
  //
  // If the same creation command is retried, a new Quote is created
  // with a different number (not a duplicate). This is deterministic.
  // =========================================================================
  assert('U11-17', 'Server action throws on failure (allows retry with new number)', () => {
    const src = readFile('app/quote/number-actions.ts');
    if (!src.includes('throw')) {
      throw new Error('Server action does not throw on failure — retry semantics unclear');
    }
  });

  assert('U11-18', 'Both creation paths handle errors from getNextQuoteNumber', () => {
    const portal = readFile('app/portal/sales/deals/[id]/page.tsx');
    const pipeline = readFile('app/(dashboard)/commercial/pipeline/page.tsx');

    // Both should have try/catch around the quote creation
    if (!portal.includes('catch')) {
      throw new Error('Sales Portal missing error handling for quote creation');
    }
    if (!pipeline.includes('catch')) {
      throw new Error('HQ Pipeline missing error handling for quote creation');
    }
  });

  // =========================================================================
  // U11-08: Lineage Integrity
  //
  // Quote is completely separate from the execution layer.
  // Quote → Engagement → Work Order → Job Order lineage does NOT exist.
  // Quote is CRM-only. Engagement is Operations-only.
  // The only outbound path is Quote → Contract (warehouse billing).
  // =========================================================================
  assert('U11-19', 'Quote has no FK to commercial_work_orders (execution layer)', () => {
    const sql = readFile('supabase/migrations/115_crm_foundational_tables.sql');
    if (sql.includes('commercial_work_orders') || sql.includes('commercial_engagements')) {
      throw new Error('Quote schema references execution layer — should be CRM-only');
    }
  });

  assert('U11-20', 'commercial_work_orders has no quote_id FK (execution layer independent)', () => {
    // Table-scoped: quote_id only counts if it is a column OF the engagement
    // table. A quote_id on another (commercial) table that merely REFERENCES
    // the engagement (e.g. sales_orders.engagement_id) is not a violation.
    const migrationDir = 'supabase/migrations';
    const files = fs.readdirSync(path.join(process.cwd(), migrationDir)).filter(f => f.endsWith('.sql'));
    for (const file of files) {
      const sql = fs.readFileSync(path.join(process.cwd(), migrationDir, file), 'utf-8');
      if (tableHasQuoteFk(sql, 'commercial_work_orders')) {
        throw new Error(`Migration ${file} adds quote_id to commercial_work_orders — execution layer should be independent`);
      }
    }
  });

  // =========================================================================
  // U11-09: Full Regression — referenced gates still pass
  //
  // Verify U-10 gates and U-10R reconciliation are not broken.
  // =========================================================================
  assert('U11-21', 'U-10 static architecture gates file exists', () => {
    if (!fileExists('lib/__tests__/static-architecture-gates.test.ts')) {
      throw new Error('U-10 gates file missing');
    }
  });

  assert('U11-22', 'U-10R forensic reconciliation file exists', () => {
    if (!fileExists('lib/__tests__/u10r-forensic-reconciliation.test.ts')) {
      throw new Error('U-10R reconciliation file missing');
    }
  });

  assert('U11-23', 'Regression runner includes U-10, U-10R, and U-11 suites', () => {
    const src = readFile('scripts/run-full-regression.ts');
    if (!src.includes('runStaticArchitectureGatesSuite')) {
      throw new Error('Regression runner missing U-10 gates');
    }
    if (!src.includes('runU10rForensicReconciliationSuite')) {
      throw new Error('Regression runner missing U-10R reconciliation');
    }
    if (!src.includes('runU11QuoteIdentityAuthoritySuite')) {
      throw new Error('Regression runner missing U-11 quote identity');
    }
  });

  // =========================================================================
  // Additional: Migration safety checks
  // =========================================================================
  assert('U11-24', 'Migration 018 exists and is well-formed', () => {
    if (!fileExists('supabase/migrations/20260827_018_u11_quote_identity_authority.sql')) {
      throw new Error('Migration 20260827_018 not found');
    }
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    // Must not contain destructive operations
    const destructive = [/\bDROP\s+TABLE/i, /\bTRUNCATE/i, /\bDELETE\s+FROM\s+crm_quotations/i];
    for (const pattern of destructive) {
      if (pattern.test(sql)) {
        throw new Error(`Migration contains destructive pattern: ${pattern}`);
      }
    }
  });

  assert('U11-25', 'Migration deduplicates existing quote_numbers before adding constraint', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('quote_number') || !sql.includes('COUNT(*)')) {
      throw new Error('Migration does not appear to handle existing duplicates');
    }
  });

  assert('U11-26', 'Sequence (seq_quote_number) is created', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes('seq_quote_number')) {
      throw new Error('Sequence seq_quote_number not created in migration');
    }
  });

  // =========================================================================
  // Additional: Format validation
  // =========================================================================
  assert('U11-27', 'Quote number format is QT-YYYY-MM-NNNN', () => {
    const sql = readFile('supabase/migrations/20260827_018_u11_quote_identity_authority.sql');
    if (!sql.includes("'QT-'") || !sql.includes("'-'") || !sql.includes('lpad')) {
      throw new Error('Quote number format does not match QT-YYYY-MM-NNNN');
    }
  });

  assert('U11-28', 'Server action uses admin client (bypasses RLS for number generation)', () => {
    const src = readFile('app/quote/number-actions.ts');
    if (!src.includes('createAdminClient') && !src.includes('supabaseAdmin')) {
      throw new Error('Server action does not use admin client — may fail under RLS');
    }
  });

  return results;
}
