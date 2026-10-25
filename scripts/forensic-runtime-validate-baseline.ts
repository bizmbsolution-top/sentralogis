/**
 * SENTRALOGIS D8-48
 * Delivery Unit 4 — Deterministic Validation Tooling (Unit 4 technical artifact)
 *
 * Authority chain:
 * - D8-45: Unit 4 scope RATIFIED (validation-only, controlled/isolated environment)
 * - D8-46: exact path/artifact allowlist RATIFIED (PATH 01 = this file)
 * - D8-47: Human Governance Gate APPROVED
 * - D8-48: HUMAN IMPLEMENTATION AUTHORIZATION — EXACT TWO-FILE ALLOWLIST
 *          (file creation only; execution NOT authorized by D8-48)
 *
 * Purpose:
 * Deterministic validation tooling for the D8-33 baseline formation artifacts,
 * operating strictly within the Unit 4 validation-only boundary.
 *
 * Mode model:
 *   --mode=static   (default) Read-only static repository validation. No database,
 *                   no SQL, no Docker, no migration execution, no writes.
 *   --mode=runtime  CONTROLLED RUNTIME VALIDATION — REQUIRES SEPARATE AUTHORIZATION.
 *                   Refuses to run unless BOTH:
 *                     (a) SENTRALOGIS_RUNTIME_REPLAY_AUTHORIZED = "D8-GATE-EXPLICIT"
 *                         (set only by a later, separately authorized runtime gate), AND
 *                     (b) SENTRALOGIS_VALIDATION_ENV names an isolated, disposable,
 *                         non-production environment (e.g. "isolated-local").
 *                   Absent both, it exits with RUNTIME NOT AUTHORIZED and
 *                   performs nothing.
 *
 * Hard boundaries enforced BY DESIGN:
 * - Reads repository files ONLY. Writes NOTHING (zero file mutations).
 * - Never modifies migrations, schemas, application code, RLS, configuration,
 *   the protected 13-file dirty set, or any D8 governance artifact.
 * - Never performs remediation. Findings are REPORTED ONLY.
 * - No Supabase / PostgreSQL / SQL / Docker / CI / staging / deployment access
 *   in static mode; runtime mode is gated as above and is not executed here.
 * - Never generates or modifies the eight D8-33 baseline artifacts.
 *
 * Evidence language: static repository evidence / deterministic static analysis.
 * Runtime validation deferred; database/runtime validation not performed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================================
// RATIFIED BASELINE CONFIGURATION (D8-30 / D8-33 — carried forward unchanged)
// ============================================================================

interface LayerDef {
  id: string;
  name: string;
  filename: string;
  expected: number;
}

const BASELINE_LAYERS: LayerDef[] = [
  { id: '001', name: 'Extensions', filename: '20260928_001_baseline_extensions.sql', expected: 4 },
  { id: '002', name: 'Types / Enums', filename: '20260928_002_baseline_types.sql', expected: 28 },
  { id: '003', name: 'Tables & Sequences', filename: '20260928_003_baseline_tables_and_sequences.sql', expected: 299 },
  { id: '004', name: 'Deferred Foreign Key Constraints', filename: '20260928_004_baseline_constraints.sql', expected: 587 },
  { id: '005', name: 'Explicit Indexes', filename: '20260928_005_baseline_indexes.sql', expected: 520 },
  { id: '006', name: 'Functions', filename: '20260928_006_baseline_functions.sql', expected: 127 },
  { id: '007', name: 'Triggers', filename: '20260928_007_baseline_triggers.sql', expected: 68 },
  { id: '008', name: 'RLS', filename: '20260928_008_baseline_rls.sql', expected: 591 },
];

const TOTAL_EXPECTED = 2224;

const STATEMENT_PATTERNS: Record<string, RegExp> = {
  '001': /^CREATE EXTENSION/m,
  '002': /^CREATE TYPE/m,
  '003': /^CREATE (?:SEQUENCE|TABLE)/m,
  '004': /^ALTER TABLE[^\n]*FOREIGN KEY/m,
  '005': /^CREATE (?:UNIQUE )?INDEX/m,
  '006': /^CREATE (?:OR REPLACE )?FUNCTION/m,
  '007': /^CREATE TRIGGER/m,
  '008': /^(?:ALTER TABLE[^\n]*ENABLE ROW LEVEL SECURITY|CREATE POLICY)/m,
};

interface CheckResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

interface Finding {
  id: string;
  classification: 'NEW' | 'INFO';
  evidence: string;
}

// ============================================================================
// READ-ONLY STATIC VALIDATION (default mode)
// ============================================================================

function runStaticValidation(root: string): { checks: CheckResult[]; findings: Finding[] } {
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  let findingSeq = 0;

  const migrationsDir = path.join(root, 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    checks.push({ id: 'S0', name: 'Repository layout', status: 'FAIL', detail: 'supabase/migrations not found — run from repository root' });
    return { checks, findings };
  }

  // S1 — Layer identity & presence (8 ratified files, nothing extra).
  const present = fs.readdirSync(migrationsDir).filter((f) => /^20260928_00\d_baseline_.*\.sql$/.test(f)).sort();
  const expectedNames = BASELINE_LAYERS.map((l) => l.filename).sort();
  const setMatch = present.length === expectedNames.length && expectedNames.every((n, i) => n === present[i]);
  checks.push({
    id: 'S1',
    name: 'Layer identity & ordering (8 ratified files)',
    status: setMatch ? 'PASS' : 'FAIL',
    detail: setMatch
      ? 'exactly 8 ratified baseline files present in 001-008 order'
      : `file set mismatch: found ${present.length}, expected ${expectedNames.length}`,
  });

  // S2 — Population reconciliation (statement counts vs ratified expected counts).
  let total = 0;
  const rows: string[] = [];
  let popPass = true;
  for (const layer of BASELINE_LAYERS) {
    const full = path.join(migrationsDir, layer.filename);
    if (!fs.existsSync(full)) {
      popPass = false;
      rows.push(`${layer.id}: MISSING`);
      continue;
    }
    const content = fs.readFileSync(full, 'utf8');
    const statements = content.split(/\r?\n/).filter((ln) => STATEMENT_PATTERNS[layer.id].test(ln)).length;
    total += statements;
    const ok = statements === layer.expected;
    if (!ok) popPass = false;
    rows.push(`${layer.id}: ${statements}/${layer.expected}${ok ? '' : ' MISMATCH'}`);
  }
  if (total !== TOTAL_EXPECTED) popPass = false;
  checks.push({
    id: 'S2',
    name: 'Layer population reconciliation',
    status: popPass ? 'PASS' : 'FAIL',
    detail: `${rows.join('; ')}; total ${total}/${TOTAL_EXPECTED}`,
  });

  // S3 — Provenance coverage (structured header per object; cited source exists).
  let provBlocks = 0;
  let provMisses = 0;
  const provRe = /-- Object:\s+(.+?)\r?\n-- Layer:\s+(.+?)\r?\n-- Source:\s+(.+?)\r?\n-- Dependencies:\s+(.+?)\r?\n-- =+\r?\n/g;
  for (const layer of BASELINE_LAYERS) {
    const full = path.join(migrationsDir, layer.filename);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    provRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = provRe.exec(content)) !== null) {
      provBlocks += 1;
      const src = m[3].trim();
      if (!src || !m[1].trim() || !m[2].trim() || !m[4].trim()) provMisses += 1;
      else if (!fs.existsSync(path.join(root, src))) provMisses += 1;
    }
  }
  const provPass = provMisses === 0 && provBlocks === total;
  if (!provPass) {
    findingSeq += 1;
    findings.push({ id: `U4-F-${String(findingSeq).padStart(3, '0')}`, classification: 'NEW', evidence: `provenance coverage gap: ${provMisses} invalid/missing; blocks ${provBlocks} vs statements ${total}` });
  }
  checks.push({
    id: 'S3',
    name: 'Provenance header coverage & source existence',
    status: provPass ? 'PASS' : 'FAIL',
    detail: `${provBlocks}/${total} structured provenance headers; ${provMisses} invalid or missing source`,
  });

  // S4 — Freeze/presence status (size only; no digest required for structure check).
  const sizes = BASELINE_LAYERS.map((l) => {
    const full = path.join(migrationsDir, l.filename);
    return fs.existsSync(full) ? fs.statSync(full).size : -1;
  });
  const allPresent = sizes.every((s) => s > 0);
  checks.push({
    id: 'S4',
    name: 'Baseline artifact presence (frozen inputs)',
    status: allPresent ? 'PASS' : 'FAIL',
    detail: allPresent
      ? `8/8 files readable; aggregate ${sizes.reduce((a, b) => a + b, 0)} bytes (no mutation performed)`
      : 'one or more baseline files missing',
  });
  if (!allPresent) {
    findingSeq += 1;
    findings.push({ id: `U4-F-${String(findingSeq).padStart(3, '0')}`, classification: 'NEW', evidence: 'baseline artifact missing or unreadable' });
  }

  // INFO: what static mode does NOT establish.
  findings.push({
    id: `U4-F-${String(findingSeq + 1).padStart(3, '0')}`,
    classification: 'INFO',
    evidence: 'static mode only: runtime/container replay, database access, and RLS runtime behavior NOT validated (deferred to a separately authorized runtime gate)',
  });

  return { checks, findings };
}

// ============================================================================
// RUNTIME MODE GATE — REQUIRES SEPARATE AUTHORIZATION (NOT AUTHORIZED BY D8-48)
// ============================================================================

function evaluateRuntimeAuthorization(): { authorized: boolean; reason: string } {
  const auth = process.env.SENTRALOGIS_RUNTIME_REPLAY_AUTHORIZED;
  const envName = process.env.SENTRALOGIS_VALIDATION_ENV;
  if (auth !== 'D8-GATE-EXPLICIT') {
    return {
      authorized: false,
      reason: 'RUNTIME NOT AUTHORIZED — SENTRALOGIS_RUNTIME_REPLAY_AUTHORIZED is absent or not "D8-GATE-EXPLICIT". A separate human runtime/deployment gate is required.',
    };
  }
  if (!envName || !/^isolated[-a-z0-9]*$/.test(envName)) {
    return {
      authorized: false,
      reason: 'RUNTIME NOT AUTHORIZED — SENTRALOGIS_VALIDATION_ENV must name an isolated, disposable, non-production environment (e.g. "isolated-local").',
    };
  }
  if (/prod|production|staging|supabase\.co/i.test(envName)) {
    return {
      authorized: false,
      reason: 'RUNTIME NOT AUTHORIZED — validation environment must be isolated, disposable, non-production, non-staging.',
    };
  }
  return { authorized: true, reason: `runtime authorization satisfied for isolated environment "${envName}"` };
}

// ============================================================================
// CLI
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith('--mode='))?.slice('--mode='.length) ?? 'static';
  const w = process.stdout.write.bind(process.stdout);

  w('============================================================\n');
  w('SENTRALOGIS UNIT 4 — DETERMINISTIC VALIDATION TOOLING\n');
  w('============================================================\n');
  w('Authority: D8-45 scope RATIFIED / D8-46 allowlist RATIFIED / D8-47 APPROVED / D8-48 TWO-FILE AUTHORIZED\n');
  w(`Requested mode: ${modeArg}\n\n`);

  if (modeArg === 'runtime') {
    const gate = evaluateRuntimeAuthorization();
    w(`RUNTIME GATE: ${gate.reason}\n`);
    if (!gate.authorized) {
      w('No runtime action performed. Exiting without execution.\n');
      w('============================================================\n');
      w('END UNIT 4 VALIDATION TOOLING (RUNTIME REFUSED)\n');
      w('============================================================\n');
      process.exitCode = 3;
      return;
    }
    w('NOTE: even when the runtime gate is satisfied by a later authorized stage,\n');
    w('this tool performs only controlled validation inside the named isolated\n');
    w('environment. Database/SQL/Docker execution is NOT implemented here and\n');
    w('requires its own separately authorized execution boundary.\n\n');
    w('FALLING BACK TO STATIC VALIDATION (no runtime engine implemented here).\n\n');
  } else if (modeArg !== 'static') {
    w(`Unknown mode "${modeArg}". Valid: --mode=static (default), --mode=runtime.\n`);
    w('============================================================\n');
    w('END UNIT 4 VALIDATION TOOLING (USAGE ERROR)\n');
    w('============================================================\n');
    process.exitCode = 2;
    return;
  }

  const root = process.cwd();
  const { checks, findings } = runStaticValidation(root);

  w('--- CHECK MATRIX (static repository evidence) ---\n');
  for (const c of checks) w(`${c.id} | ${c.name} | ${c.status} | ${c.detail}\n`);
  w('\n--- FINDINGS ---\n');
  if (findings.length === 0) w('NONE\n');
  for (const f of findings) w(`${f.id} | ${f.classification} | ${f.evidence}\n`);

  const pass = checks.filter((c) => c.status === 'PASS').length;
  const newCount = findings.filter((f) => f.classification === 'NEW').length;
  w('\n--- SUMMARY ---\n');
  w(`Checks PASS:       ${pass}/${checks.length}\n`);
  w(`Findings NEW:      ${newCount}\n`);
  w('Remediation:       0 (report-only; no fix applied)\n');
  w('Files written:     0 (read-only tool; writes NOTHING)\n');
  w('Evidence basis:    static repository evidence / deterministic static analysis\n');
  w('Database / SQL:    NOT ACCESSED (static mode)\n');
  w('Runtime / Docker:  NOT PERFORMED (separately gated; not authorized by D8-48)\n');
  w('============================================================\n');
  w('END UNIT 4 VALIDATION TOOLING\n');
  w('============================================================\n');
}

main();
