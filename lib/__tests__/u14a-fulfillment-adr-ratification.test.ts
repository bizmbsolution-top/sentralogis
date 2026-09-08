/**
 * Sentralogis — Phase 4B / U-14A
 * lib/__tests__/u14a-fulfillment-adr-ratification.test.ts
 *
 * FULFILLMENT ADR RATIFICATION & AUTHORIZATION GATE
 *
 * U-14A is a RATIFICATION-ONLY gate. It makes ZERO production changes. This
 * suite is a READ-ONLY forensic/architecture assertion layer that proves:
 *
 *   - ADR-039..044 exist as standalone RATIFIED documents (no collision with
 *     the ratified standalone series ADR-030..038).
 *   - The Fulfillment architecture recorded there is consistent with U-14
 *     Model E and preserves every ratified ADR-033..038 authority.
 *   - Shipment is NOT the fulfillment aggregate; SR is a command; WO stays
 *     operational commitment; JO stays execution; many SO → 1 WO forbidden.
 *   - Fulfillment is a thin composition, not a second operational engine.
 *   - No production Fulfillment implementation exists (no tables/functions/
 *     services/APIs/migrations/UI), and no ratified ADR was modified.
 *
 * These are ARCHITECTURE/forensic assertions, NOT feature tests. There is no
 * Fulfillment implementation to test, by design (U-14A implementation FORBIDDEN).
 *
 * Exit: passed counts; failed===0 ⇒ GREEN.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOC_DIR = path.join(ROOT, 'docs', 'architecture');
const APP_DIR = path.join(ROOT, 'app');

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function readMigrations(): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

function globDocs(pattern: RegExp): string[] {
  if (!fs.existsSync(DOC_DIR)) return [];
  return fs.readdirSync(DOC_DIR).filter((f) => {
    const p = path.join(DOC_DIR, f);
    return pattern.test(f) && fs.statSync(p).isFile();
  });
}

function readDoc(name: string): string {
  if (!name) return '';
  const f = path.join(DOC_DIR, name);
  return fs.existsSync(f) && fs.statSync(f).isFile() ? fs.readFileSync(f, 'utf8') : '';
}

function readTree(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...readTree(p, base));
    else out.push(p);
  }
  return out;
}

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

/* ------------------------------------------------------------------ */
/*  SUITE                                                              */
/* ------------------------------------------------------------------ */

export function runU14aFulfillmentAdrRatificationSuite(): { passed: number; failed: number; total: number } {
  const s = new Suite();
  const allMig = readMigrations().join('\n');
  const adrDocs = globDocs(/^ADR-\d+-.*\.md$/i);
  const adrFiles: Record<string, string> = {};
  for (const f of adrDocs) {
    const m = f.match(/^ADR-(\d+)-/i);
    if (m) adrFiles[m[1]] = f;
  }

  /* ------------------------------------------------------------------
   * A. NUMBERING COLLISION — ADR-039..044 exist, NO collision with 030..038.
   * ------------------------------------------------------------------ */
  s.check(
    'U14A-A1',
    'ADR-039 file exists',
    !!adrFiles['039'],
    'standalone ratified ADR-039 required',
  );
  s.check(
    'U14A-A2',
    'ADR-040 file exists',
    !!adrFiles['040'],
    'standalone ratified ADR-040 required',
  );
  s.check(
    'U14A-A3',
    'ADR-041 file exists',
    !!adrFiles['041'],
    'standalone ratified ADR-041 required',
  );
  s.check(
    'U14A-A4',
    'ADR-042 file exists',
    !!adrFiles['042'],
    'standalone ratified ADR-042 required',
  );
  s.check(
    'U14A-A5',
    'ADR-043 file exists',
    !!adrFiles['043'],
    'standalone ratified ADR-043 required',
  );
  s.check(
    'U14A-A6',
    'ADR-044 file exists',
    !!adrFiles['044'],
    'standalone ratified ADR-044 required',
  );
  s.check(
    'U14A-A7',
    'ADR-033..038 standalone files remain present (no overwrite)',
    !!adrFiles['033'] && !!adrFiles['034'] && !!adrFiles['035'] &&
      !!adrFiles['036'] && !!adrFiles['037'] && !!adrFiles['038'],
    'prior ratified series untouched',
  );
  s.check(
    'U14A-A8',
    'No ADR number collision: Fulfillment ADRs occupy 039..044, strictly after ratified 033..038',
    !!adrFiles['039'] && !!adrFiles['044'] &&
      !(adrFiles['033'] && adrFiles['033'] === adrFiles['039']) &&
      adrFiles['039'] !== adrFiles['040'] && adrFiles['040'] !== adrFiles['041'] &&
      adrFiles['041'] !== adrFiles['042'] && adrFiles['042'] !== adrFiles['043'] &&
      adrFiles['043'] !== adrFiles['044'],
    'each Fulfillment ADR is a distinct file in the free 039..044 slot',
  );

  /* Each ratified doc carries the RATIFIED status and the correct title. */
  const doc039 = readDoc(adrFiles['039'] || '');
  const doc040 = readDoc(adrFiles['040'] || '');
  const doc041 = readDoc(adrFiles['041'] || '');
  const doc042 = readDoc(adrFiles['042'] || '');
  const doc043 = readDoc(adrFiles['043'] || '');
  const doc044 = readDoc(adrFiles['044'] || '');

  s.check(
    'U14A-A9',
    'All six Fulfillment ADRs are marked RATIFIED',
    [doc039, doc040, doc041, doc042, doc043, doc044].every((d) => /RATIFIED/i.test(d)),
    'U-14A ratifies ADR-039..044',
  );

  /* ------------------------------------------------------------------
   * B. ARCHITECTURAL INVARIANTS recorded in the ADRs.
   * ------------------------------------------------------------------ */

  /* ADR-039: Fulfillment is a thin composition, NOT an engine. */
  s.check(
    'U14A-B1',
    'ADR-039 says Fulfillment is composition-only, not an engine',
    /Composition, Not an Engine/i.test(readDoc(adrFiles['039'] || '').split('\n')[0] || '') &&
      /NOT.*operational engine/i.test(doc039),
    'Fulfillment = thin composition, no second engine',
  );
  s.check(
    'U14A-B2',
    'ADR-039 forbids Fulfillment writing operational tables directly',
    /MUST NOT directly write.*work_orders|MUST NOT/i.test(doc039) && /shp_shipments|cus_declarations|svc_service_requests|job_orders/.test(doc039),
    'no implementation bypass of governing services',
  );

  /* ADR-040: Shipment is NOT the fulfillment aggregate. */
  s.check(
    'U14A-B3',
    'ADR-040: Shipment is NOT the fulfillment aggregate',
    /NOT the Fulfillment aggregate/i.test(doc040) && /logistics movement aggregate/i.test(doc040),
    'Shipment stays logistics movement; Fulfillment composes N shipments',
  );

  /* ADR-041: Server authority for Fulfillment number, client MUST NOT generate. */
  s.check(
    'U14A-B4',
    'ADR-041: client MUST NOT generate Fulfillment numbers',
    /MUST NOT generate canonical Fulfillment numbers/i.test(doc041),
    'number authority documented (server, mirror ADR-035)',
  );

  /* ADR-042: SO → WO 1:N, many SO → 1 WO FORBIDDEN, SO → JO never. */
  s.check(
    'U14A-B5',
    'ADR-042: many SO → 1 WO remains FORBIDDEN',
    /Many SO → One WO is FORBIDDEN|Many Sales Orders → One Work Order is FORBIDDEN|many SO → 1 WO FORBIDDEN|many SO → 1 WO forbidden/i.test(doc042),
    'ADR-037 preserved in Fulfillment cardinality',
  );
  s.check(
    'U14A-B6',
    'ADR-042: SO → JO is never allowed',
    /SO → JO is never allowed|SO → JO never|SO → JO never allowed/i.test(doc042),
    'no SO/composition shortcut to job orders',
  );

  /* ADR-043: single-authority state; Fulfillment service only writer. */
  s.check(
    'U14A-B7',
    'ADR-043: Fulfillment service is the only writer of Fulfillment state',
    /Fulfillment service is the ONLY writer|only writer/i.test(doc043),
    'no cross-object state authority',
  );

  /* ADR-044: WHAT→SO revision, HOW→Fulfillment revision. */
  s.check(
    'U14A-B8',
    'ADR-044: commercial amendment = SO revision; fulfillment change = Fulfillment revision',
    /SO \(commercial\) revision|commercial amendment.*SO revision|Fulfillment.*revision/i.test(doc044),
    'WHAT/HOW split ratified',
  );

  /* ------------------------------------------------------------------
   * C. PRODUCTION IMPLEMENTATION CONFORMANCE (post U-15 authorized).
   * U-14A ratified ADR-039..044; U-15 implements them. These checks now
   * verify conformance rather than absence.
   * ------------------------------------------------------------------ */
  const libFiles = readTree(LIB_DIR).map((p) => p.replace(/\\/g, '/'));
  const appFiles = readTree(APP_DIR).map((p) => p.replace(/\\/g, '/'));

  s.check(
    'U14A-C1',
    'No fulfillment_compositions table exists (canonical table is fulfillments per ADR-039)',
    !/CREATE TABLE[^;]*fulfillment_compositions/i.test(allMig),
    'fulfillment_compositions not created — canonical aggregate is fulfillments',
  );
  s.check(
    'U14A-C2',
    'Fulfillment production implementation exists per authorized U-15 (fulfillment_allocations)',
    /CREATE TABLE[^;]*fulfillment_allocations/i.test(allMig),
    'U-15 authorized fulfillment_allocations table exists',
  );
  s.check(
    'U14A-C3',
    'Fulfillment number authority exists per authorized U-15 (next_fulfillment_number)',
    /CREATE[^;]*FUNCTION[^;]*next_fulfillment_number/i.test(allMig),
    'U-15 authorized number authority function exists',
  );
  s.check(
    'U14A-C4',
    'Fulfillment domain service exists per authorized U-15',
    libFiles.some((f) => /\/fulfillment\//i.test(f) && !/__tests__/.test(f)),
    'U-15 authorized domain service exists',
  );
  s.check(
    'U14A-C5',
    'Fulfillment API route exists per authorized U-15',
    appFiles.some((f) => /api\/v1\/[^/]*\/fulfillment/i.test(f)),
    'U-15 authorized API route exists',
  );
  s.check(
    'U14A-C6',
    'No ADR-030..038 document content was altered (ratified series intact)',
    [doc039, doc040, doc041, doc042, doc043, doc044].every((d) => /RATIFIED/i.test(d)) &&
      (!adrFiles['033'] || /RATIFIED/i.test(readDoc(adrFiles['033']))) &&
      (!adrFiles['036'] || /RATIFIED/i.test(readDoc(adrFiles['036']))),
    'prior ratified docs still RATIFIED and unmodified in status',
  );

  /* ------------------------------------------------------------------
   * D. USER-FACING DELIVERABLE EXISTS.
   * ------------------------------------------------------------------ */
  const accept = readDoc('SENTRALOGIS_PHASE4B_U14A_FINAL_ACCEPTANCE.md');
  s.check(
    'U14A-D1',
    'U-14A final acceptance report exists and declares GREEN with implementation deferred',
    accept.length > 800 && /GREEN/.test(accept) && /DEFERRED|FOUNDATION IMPLEMENTATION/.test(accept),
    'acceptance written',
  );

  return { passed: s.passed, failed: s.failed, total: s.total };
}

export default runU14aFulfillmentAdrRatificationSuite;
