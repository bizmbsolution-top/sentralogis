/**
 * SENTRALOGIS D8-42
 * Delivery Unit 3 — Forensic Static Validation Tooling
 *
 * Authority:
 * - D8-38: Unit 3 Forensic / Static Validation Scope (RATIFIED)
 * - D8-39: Exact Path / Artifact Allowlist (RATIFIED — this file path)
 * - D8-40: Human Governance Gate Approval
 * - D8-41: Human Implementation Authorization
 * - D8-42: Implementation Execution (exact phrase verified)
 *
 * Purpose:
 * Deterministic, READ-ONLY static forensic validation of the eight D8-33
 * baseline formation artifacts against the ratified D8-30 architecture,
 * the D8-33 implementation record, the D8-34 independently validated
 * evidence, and static source-schema evidence under supabase/schemas/**.
 *
 * Coverage (Unit 3 scope items A-F, D8-38):
 *   C1  Layer identity and ordering
 *   C2  Expected layer population
 *   C3  Source-schema provenance headers
 *   C4  Object identity consistency
 *   C5  Dependency representation & resolution
 *   C6  Cross-layer dependency consistency (incl. topological order)
 *   C7  Deterministic structure (ratified sort rules, byte stability)
 *   C8  Migration-to-source-schema traceability (both directions)
 *   C9  Protection / freeze status of the D8-33 baseline artifacts
 *   C10 Classification of findings (D8-35 accepted items stay closed)
 *
 * Hard boundaries enforced BY DESIGN:
 * - Reads repository files ONLY. Writes NOTHING (zero file mutations).
 * - No database / PostgreSQL / Supabase access. No SQL execution.
 * - No Docker, CI, staging, production, or deployment interaction.
 * - Does NOT modify the D8-33 baseline, the D8-33 generator, schemas,
 *   application code, governance artifacts, or the protected dirty set.
 * - Findings are REPORTED ONLY. No remediation is performed.
 *
 * Evidence language: static repository evidence / deterministic static
 * analysis. Runtime validation deferred; database/runtime validation
 * not performed.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ============================================================================
// RATIFIED CONSTANTS (D8-30 ratified architecture / D8-33 record / D8-34 matrix)
// ============================================================================

const BASELINE_HEAD = '9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999';

interface RatifiedLayer {
  id: string;
  name: string;
  filename: string;
  expected: number;
}

const RATIFIED_LAYERS: RatifiedLayer[] = [
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
const EXPECTED_SUBCOUNTS = { sequences: 9, tables: 290, rlsEnable: 258, policies: 333 };
const D8_33_DOC_TOTAL_BYTES = 1475872; // documented aggregate (superseded by on-disk; D8-34-DISC-02)
const D8_34_ACTUAL_TOTAL_BYTES = 1549790; // D8-34 audit fact (on-disk authoritative)
const EXPECTED_FK_AUTH_USERS = 52; // D8-33: 52 auth.users external references
const EXPECTED_FK_SELF_REF = 11; // D8-33: 11 self-references
const RETIRED_REPORT = 'docs/architecture/SENTRALOGIS_D8_42_UNIT_3_FORENSIC_EVIDENCE_REPORT.md';

type Classification = 'PASS' | 'ACCEPTED_CLOSED_D8_35' | 'NEW_STATIC_DISCREPANCY' | 'INFO';

interface Finding {
  id: string;
  check: string;
  classification: Classification;
  evidence: string;
}

interface CheckResult {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

const findings: Finding[] = [];
const checks: CheckResult[] = [];
let findingSeq = 0;

function addFinding(check: string, classification: Classification, evidence: string): void {
  findingSeq += 1;
  findings.push({ id: `U3-F-${String(findingSeq).padStart(3, '0')}`, check, classification, evidence });
}

function record(check: string, name: string, pass: boolean, detail: string): void {
  checks.push({ id: check, name, status: pass ? 'PASS' : 'FAIL', detail });
}

// ============================================================================
// STATIC PARSING HELPERS (independent of scripts/generate-baseline-layers.ts)
// ============================================================================

interface ProvBlock {
  object: string;
  layerField: string;
  source: string;
  dependencies: string;
  region: string;
}

interface LayerFile {
  def: RatifiedLayer;
  path: string;
  content: string;
  bytes: number;
  sha256: string;
  headerLayer: string | null;
  headerTotal: number | null;
  headerBaseline: string | null;
  blocks: ProvBlock[];
}

const OBJ_HEADER_RE =
  /-- Object:\s+(.+?)\r?\n-- Layer:\s+(.+?)\r?\n-- Source:\s+(.+?)\r?\n-- Dependencies:\s+(.+?)\r?\n-- =+\r?\n/g;

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function bare(objectName: string): string {
  const idx = objectName.indexOf('.');
  if (idx === -1) return objectName;
  const prefix = objectName.slice(0, idx);
  return prefix === 'extension' || prefix === 'public' ? objectName.slice(idx + 1) : objectName;
}

function kindOf(region: string): string {
  if (/^CREATE EXTENSION/m.test(region)) return 'extension';
  if (/^CREATE TYPE/m.test(region)) return 'type';
  if (/^CREATE SEQUENCE/m.test(region)) return 'sequence';
  if (/^CREATE TABLE/m.test(region)) return 'table';
  if (/^ALTER TABLE[^\n]*ENABLE ROW LEVEL SECURITY/m.test(region)) return 'enable_rls';
  if (/^ALTER TABLE[^\n]*FOREIGN KEY/m.test(region)) return 'fk';
  if (/^CREATE (?:UNIQUE )?INDEX/m.test(region)) return 'index';
  if (/^CREATE OR REPLACE FUNCTION|^CREATE FUNCTION/m.test(region)) return 'function';
  if (/^CREATE TRIGGER/m.test(region)) return 'trigger';
  if (/^CREATE POLICY/m.test(region)) return 'policy';
  return 'unknown';
}

function fkParts(region: string): { src: string | null; constraint: string | null; target: string | null } {
  const src = region.match(/^ALTER TABLE\s+"?public"?\."?([A-Za-z0-9_]+)"?\s+ADD CONSTRAINT/m)?.[1] ?? null;
  const constraint = region.match(/ADD CONSTRAINT\s+"?([A-Za-z0-9_]+)"?\s+FOREIGN KEY/m)?.[1] ?? null;
  const target = region.match(/REFERENCES\s+((?:[A-Za-z0-9_]+\.)?[A-Za-z0-9_]+)/)?.[1] ?? null;
  return { src, constraint, target };
}

function indexParts(region: string): { name: string | null; table: string | null } {
  const m = region.match(
    /CREATE (?:UNIQUE )?INDEX\s+"?([A-Za-z0-9_]+)"?\s+ON\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/m
  );
  return { name: m?.[1] ?? null, table: m?.[2] ?? null };
}

function triggerParts(region: string): { name: string | null; table: string | null; fn: string | null } {
  const name = region.match(/^CREATE TRIGGER\s+"?([A-Za-z0-9_]+)"?/m)?.[1] ?? null;
  const table = region.match(/^CREATE TRIGGER[^\n]*\n[^\n]*\bON\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/m)?.[1] ?? null;
  const fn = region.match(/EXECUTE FUNCTION\s+(?:public\.)?"?([A-Za-z0-9_]+)"?\s*\(/m)?.[1] ?? null;
  return { name, table, fn };
}

function policyParts(region: string): { name: string | null; table: string | null } {
  const m = region.match(/^CREATE POLICY\s+"([^"]+)"\s+ON\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?/m);
  return { name: m?.[1] ?? null, table: m?.[2] ?? null };
}

function enableTable(region: string): string | null {
  return region.match(/^ALTER TABLE\s+(?:"?public"?\.)?"?([A-Za-z0-9_]+)"?\s+ENABLE ROW LEVEL SECURITY/m)?.[1] ?? null;
}

function parseLayerFile(def: RatifiedLayer, filePath: string): LayerFile {
  const buf = fs.readFileSync(filePath);
  const content = buf.toString('utf8');
  const blocks: ProvBlock[] = [];
  OBJ_HEADER_RE.lastIndex = 0;
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = OBJ_HEADER_RE.exec(content)) !== null) matches.push(match);
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const regionStart = m.index + m[0].length;
    const regionEnd = i + 1 < matches.length ? matches[i + 1].index : content.length;
    blocks.push({
      object: m[1].trim(),
      layerField: m[2].trim(),
      source: m[3].trim(),
      dependencies: m[4].trim(),
      region: content.slice(regionStart, regionEnd),
    });
  }
  return {
    def,
    path: filePath,
    content,
    bytes: buf.length,
    sha256: sha256(buf),
    headerLayer: content.match(/^-- Layer:\s+(.+)$/m)?.[1]?.trim() ?? null,
    headerTotal: Number(content.match(/^-- Total Objects:\s+(\d+)$/m)?.[1] ?? NaN),
    headerBaseline: content.match(/^-- Baseline:\s+([0-9a-f]+)$/m)?.[1] ?? null,
    blocks,
  };
}

// ============================================================================
// MAIN STATIC FORENSIC ANALYSIS
// ============================================================================

function main(): void {
  const root = process.cwd();
  const migrationsDir = path.join(root, 'supabase', 'migrations');
  const schemasDir = path.join(root, 'supabase', 'schemas');
  if (!fs.existsSync(migrationsDir) || !fs.existsSync(schemasDir)) {
    process.stderr.write('FATAL: run from repository root (supabase/migrations and supabase/schemas required).\n');
    process.exit(2);
  }

  // Pass 1: read the eight baseline artifacts (read-only).
  const layers: LayerFile[] = RATIFIED_LAYERS.map((def) =>
    parseLayerFile(def, path.join(migrationsDir, def.filename))
  );

  // --------------------------------------------------------------------------
  // C1 — LAYER IDENTITY AND ORDERING
  // --------------------------------------------------------------------------
  const baselinePattern = /^20260928_00\d_baseline_.*\.sql$/;
  const actualBaselineFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => baselinePattern.test(f))
    .sort();
  const expectedFiles = RATIFIED_LAYERS.map((l) => l.filename).slice().sort();
  const fileSetMatch =
    actualBaselineFiles.length === expectedFiles.length &&
    expectedFiles.every((f, i) => f === actualBaselineFiles[i]);

  let c1Pass = fileSetMatch;
  const c1Details: string[] = [];
  if (!fileSetMatch) {
    c1Details.push(`file set mismatch: expected ${expectedFiles.length}, found ${actualBaselineFiles.length}`);
    addFinding('C1', 'NEW_STATIC_DISCREPANCY', `baseline file set mismatch: ${actualBaselineFiles.join(', ')}`);
  }
  for (const layer of layers) {
    const expectedHeader = `${layer.def.id} ${layer.def.name}`;
    if (layer.headerLayer !== expectedHeader) {
      c1Pass = false;
      c1Details.push(`${layer.def.filename}: header layer '${layer.headerLayer}' != '${expectedHeader}'`);
      addFinding('C1', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename} header Layer mismatch`);
    }
    if (layer.headerBaseline !== BASELINE_HEAD) {
      c1Pass = false;
      c1Details.push(`${layer.def.filename}: header baseline '${layer.headerBaseline}' != HEAD`);
      addFinding('C1', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename} header Baseline hash mismatch`);
    }
    for (const block of layer.blocks) {
      if (block.layerField !== expectedHeader) {
        c1Pass = false;
        addFinding('C1', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: object '${block.object}' declares layer '${block.layerField}'`);
        break;
      }
    }
  }
  record('C1', 'Layer identity and ordering', c1Pass, c1Pass && c1Details.length === 0
    ? 'exactly 8 ratified files in 001-008 order; every file/provenance header matches ratified layer identity and baseline HEAD'
    : c1Details.join('; '));

  // --------------------------------------------------------------------------
  // C2 — EXPECTED LAYER POPULATION
  // --------------------------------------------------------------------------
  let c2Pass = true;
  let totalObjects = 0;
  const c2Details: string[] = [];
  for (const layer of layers) {
    const count = layer.blocks.length;
    totalObjects += count;
    if (count !== layer.def.expected) {
      c2Pass = false;
      c2Details.push(`${layer.def.id}: ${count} != ${layer.def.expected}`);
      addFinding('C2', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: ${count} provenance objects != ratified ${layer.def.expected}`);
    }
    if (layer.headerTotal !== count) {
      c2Pass = false;
      c2Details.push(`${layer.def.id}: header Total Objects ${layer.headerTotal} != parsed ${count}`);
      addFinding('C2', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: header Total Objects mismatch`);
    }
  }
  if (totalObjects !== TOTAL_EXPECTED) {
    c2Pass = false;
    c2Details.push(`total ${totalObjects} != ${TOTAL_EXPECTED}`);
    addFinding('C2', 'NEW_STATIC_DISCREPANCY', `total objects ${totalObjects} != ratified 2224`);
  }
  const l3 = layers[2];
  const seqCount = l3.blocks.filter((b) => kindOf(b.region) === 'sequence').length;
  const tableCount = l3.blocks.filter((b) => kindOf(b.region) === 'table').length;
  const l8 = layers[7];
  const enableCount = l8.blocks.filter((b) => kindOf(b.region) === 'enable_rls').length;
  const policyCount = l8.blocks.filter((b) => kindOf(b.region) === 'policy').length;
  if (seqCount !== EXPECTED_SUBCOUNTS.sequences || tableCount !== EXPECTED_SUBCOUNTS.tables) {
    c2Pass = false;
    c2Details.push(`003 subcounts seq=${seqCount} tables=${tableCount}`);
    addFinding('C2', 'NEW_STATIC_DISCREPANCY', `layer 003 subcounts: ${seqCount} sequences + ${tableCount} tables != 9 + 290`);
  }
  if (enableCount !== EXPECTED_SUBCOUNTS.rlsEnable || policyCount !== EXPECTED_SUBCOUNTS.policies) {
    c2Pass = false;
    c2Details.push(`008 subcounts enable=${enableCount} policies=${policyCount}`);
    addFinding('C2', 'NEW_STATIC_DISCREPANCY', `layer 008 subcounts: ${enableCount} enable + ${policyCount} policies != 258 + 333`);
  }
  record('C2', 'Expected layer population', c2Pass, c2Pass
    ? `all 8 layers reconcile: 4+28+299+587+520+127+68+591 = ${totalObjects} objects; subcounts 9/290 and 258/333 confirmed`
    : c2Details.join('; '));

  // --------------------------------------------------------------------------
  // C3 — SOURCE-SCHEMA PROVENANCE HEADERS
  // --------------------------------------------------------------------------
  let c3Pass = true;
  const c3Details: string[] = [];
  const stmtCountPatterns: Record<string, RegExp> = {
    '001': /^CREATE EXTENSION/m,
    '002': /^CREATE TYPE/m,
    '003': /^CREATE (?:SEQUENCE|TABLE)/m,
    '004': /^ALTER TABLE[^\n]*FOREIGN KEY/m,
    '005': /^CREATE (?:UNIQUE )?INDEX/m,
    '006': /^CREATE (?:OR REPLACE )?FUNCTION/m,
    '007': /^CREATE TRIGGER/m,
    '008': /^(?:ALTER TABLE[^\n]*ENABLE ROW LEVEL SECURITY|CREATE POLICY)/m,
  };
  for (const layer of layers) {
    const rawStatements = layer.content
      .split(/\r?\n/)
      .filter((ln) => stmtCountPatterns[layer.def.id].test(ln)).length;
    if (rawStatements !== layer.blocks.length) {
      c3Pass = false;
      c3Details.push(`${layer.def.id}: ${rawStatements} line-start DDL statements vs ${layer.blocks.length} provenance blocks`);
      addFinding('C3', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: DDL statement count ${rawStatements} != provenance block count ${layer.blocks.length} (statement without structured header or header without statement)`);
    }
    for (const block of layer.blocks) {
      if (!block.object || !block.layerField || !block.source || !block.dependencies) {
        c3Pass = false;
        addFinding('C3', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: incomplete provenance header for '${block.object || '(unnamed)'}'`);
        break;
      }
      if (!fs.existsSync(path.join(root, block.source))) {
        c3Pass = false;
        addFinding('C3', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: object '${block.object}' cites missing source file ${block.source}`);
      }
    }
  }
  record('C3', 'Source-schema provenance headers', c3Pass, c3Pass
    ? `${totalObjects}/${totalObjects} structured provenance headers; every cited source file exists on disk`
    : c3Details.join('; ') || 'see findings');

  // --------------------------------------------------------------------------
  // C4 — OBJECT IDENTITY CONSISTENCY
  // --------------------------------------------------------------------------
  let c4Pass = true;
  const tableSet = new Set<string>();
  const seqSet = new Set<string>();
  const fnSet = new Set<string>();
  const indexNames = new Set<string>();
  const identityLogs = new Map<string, Set<string>>();
  function uniqueIdentity(key: string, identity: string, ctx: string): void {
    if (identity === null || identity === undefined || identity === '') return;
    if (!identityLogs.has(key)) identityLogs.set(key, new Set());
    const set = identityLogs.get(key) as Set<string>;
    if (set.has(identity)) {
      c4Pass = false;
      addFinding('C4', 'NEW_STATIC_DISCREPANCY', `duplicate ${key} identity '${identity}' (${ctx})`);
    }
    set.add(identity);
  }
  for (const layer of layers) {
    for (const block of layer.blocks) {
      uniqueIdentity(`${layer.def.id}:canonical`, block.object, layer.def.filename);
      const kind = kindOf(block.region);
      if (layer.def.id === '003' && kind === 'table') tableSet.add(bare(block.object));
      if (layer.def.id === '003' && kind === 'sequence') seqSet.add(bare(block.object));
      if (layer.def.id === '006') fnSet.add(bare(block.object));
      if (kind === 'fk') {
        const p = fkParts(block.region);
        uniqueIdentity('fk-per-table', `${p.src}.${p.constraint}`, block.object);
      }
      if (kind === 'index') {
        const p = indexParts(block.region);
        if (p.name) {
          if (indexNames.has(p.name)) {
            c4Pass = false;
            addFinding('C4', 'NEW_STATIC_DISCREPANCY', `duplicate index name '${p.name}'`);
          }
          indexNames.add(p.name);
        }
      }
      if (kind === 'trigger') {
        const p = triggerParts(block.region);
        uniqueIdentity('trigger-per-table', `${p.table}.${p.name}`, block.object);
      }
      if (kind === 'enable_rls') {
        uniqueIdentity('enable-rls-per-table', enableTable(block.region) ?? '', block.object);
      }
      if (kind === 'policy') {
        const p = policyParts(block.region);
        uniqueIdentity('policy-per-table', `${p.table}.${p.name}`, block.object);
      }
    }
  }
  record('C4', 'Object identity consistency', c4Pass, c4Pass
    ? `no duplicate canonical identities across ${totalObjects} objects; per-table uniqueness holds for FK/trigger/policy/RLS; index names globally unique`
    : 'see findings');

  // --------------------------------------------------------------------------
  // C5 — DEPENDENCY REPRESENTATION & RESOLUTION
  // --------------------------------------------------------------------------
  let c5Pass = true;
  const c5Details: string[] = [];
  let fkAuthUsers = 0;
  let fkSelfRef = 0;
  let fkCrossTable = 0;
  let fkUnresolved = 0;
  for (const layer of layers) {
    for (const block of layer.blocks) {
      const kind = kindOf(block.region);
      if (kind === 'fk') {
        const p = fkParts(block.region);
        if (!p.src || !p.constraint || !p.target) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `unparseable FK statement: ${block.object}`);
          continue;
        }
        if (!tableSet.has(p.src)) {
          c5Pass = false;
          fkUnresolved += 1;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `FK source table '${p.src}' not present in Layer 003 (${block.object})`);
        }
        const targetToken = p.target;
        if (targetToken.includes('auth.') || targetToken.includes('storage.')) {
          fkAuthUsers += 1;
        } else {
          const targetTable = targetToken.replace(/^public\./, '');
          if (targetTable === p.src) fkSelfRef += 1;
          else fkCrossTable += 1;
          if (!tableSet.has(targetTable)) {
            c5Pass = false;
            fkUnresolved += 1;
            addFinding('C5', 'NEW_STATIC_DISCREPANCY', `FK target '${targetToken}' unresolved against Layer 003 (${block.object})`);
          }
        }
      } else if (kind === 'index') {
        const p = indexParts(block.region);
        if (!p.table || !tableSet.has(p.table)) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `index '${p.name}' targets table '${p.table}' not present in Layer 003`);
        }
      } else if (kind === 'trigger') {
        const p = triggerParts(block.region);
        if (!p.table || !tableSet.has(p.table)) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `trigger '${p.name}' targets table '${p.table}' not present in Layer 003`);
        }
        if (!p.fn || !fnSet.has(p.fn)) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `trigger '${p.name}' executes function '${p.fn}' not present in Layer 006`);
        }
      } else if (kind === 'enable_rls') {
        const t = enableTable(block.region);
        if (!t || !tableSet.has(t)) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `ENABLE RLS targets table '${t}' not present in Layer 003`);
        }
      } else if (kind === 'policy') {
        const p = policyParts(block.region);
        if (!p.table || !tableSet.has(p.table)) {
          c5Pass = false;
          addFinding('C5', 'NEW_STATIC_DISCREPANCY', `policy '${p.name}' targets table '${p.table}' not present in Layer 003`);
        }
      }
    }
  }
  if (fkAuthUsers !== EXPECTED_FK_AUTH_USERS || fkSelfRef !== EXPECTED_FK_SELF_REF) {
    c5Pass = false;
    addFinding('C5', 'NEW_STATIC_DISCREPANCY', `FK composition: auth.*=${fkAuthUsers} (expected ${EXPECTED_FK_AUTH_USERS}), self-ref=${fkSelfRef} (expected ${EXPECTED_FK_SELF_REF})`);
  }
  c5Details.push(
    `FK: ${fkCrossTable} cross-table + ${fkSelfRef} self-ref + ${fkAuthUsers} auth.* external = ${fkCrossTable + fkSelfRef + fkAuthUsers} resolved; unresolved=${fkUnresolved}`,
    'index/trigger/policy/RLS targets resolved against Layers 003/006'
  );
  record('C5', 'Dependency representation & resolution', c5Pass, c5Pass ? c5Details.join('; ') : c5Details.join('; ') + '; see findings');

  // --------------------------------------------------------------------------
  // C6 — CROSS-LAYER DEPENDENCY CONSISTENCY (incl. topological order)
  // --------------------------------------------------------------------------
  let c6Pass = true;
  const c6Details: string[] = [];
  // (a) file sequence order 001..008 enforced in C1 (sorted filename order).
  // (b) Layer 003: all sequences precede all tables.
  const seqIdx: number[] = [];
  const tblIdx: number[] = [];
  l3.blocks.forEach((b, i) => {
    const k = kindOf(b.region);
    if (k === 'sequence') seqIdx.push(i);
    if (k === 'table') tblIdx.push(i);
  });
  const seqBeforeTables = seqIdx.length > 0 && tblIdx.length > 0 && Math.max(...seqIdx) < Math.min(...tblIdx);
  if (!seqBeforeTables) {
    c6Pass = false;
    addFinding('C6', 'NEW_STATIC_DISCREPANCY', 'Layer 003 sequences are not all emitted before base tables');
  }
  // (c) Layer 008: all ENABLE RLS (Section 1) precede all CREATE POLICY (Section 2).
  const enIdx: number[] = [];
  const polIdx: number[] = [];
  l8.blocks.forEach((b, i) => {
    const k = kindOf(b.region);
    if (k === 'enable_rls') enIdx.push(i);
    if (k === 'policy') polIdx.push(i);
  });
  const sectionsOrdered = enIdx.length > 0 && polIdx.length > 0 && Math.max(...enIdx) < Math.min(...polIdx);
  if (!sectionsOrdered) {
    c6Pass = false;
    addFinding('C6', 'NEW_STATIC_DISCREPANCY', 'Layer 008 Section 1 (ENABLE RLS) does not precede Section 2 (policies)');
  }
  // (d) Topological validity of Layer 003 table order vs source-schema FK DAG.
  const tableOrder: string[] = tblIdx.map((i) => bare(l3.blocks[i].object));
  const pos = new Map<string, number>();
  tableOrder.forEach((t, i) => pos.set(t, i));
  interface Edge { src: string; tgt: string; }
  const edges: Edge[] = [];
  const tableFiles = fs.readdirSync(path.join(schemasDir, 'public', 'tables')).filter((f) => f.endsWith('.sql'));
  for (const file of tableFiles) {
    const srcContent = fs.readFileSync(path.join(schemasDir, 'public', 'tables', file), 'utf8');
    const m = srcContent.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\."?([A-Za-z0-9_]+)"?/i);
    const srcName = m?.[1] ?? file.replace(/\.sql$/, '');
    const refRe = /\bREFERENCES\s+((?:[A-Za-z0-9_]+\.)?[A-Za-z0-9_]+)/g;
    let refMatch: RegExpExecArray | null;
    while ((refMatch = refRe.exec(srcContent)) !== null) {
      let token = refMatch[1].replace(/"/g, '');
      if (token.startsWith('auth.') || token.startsWith('storage.')) continue;
      token = token.replace(/^public\./, '');
      if (token === srcName) continue;
      edges.push({ src: srcName, tgt: token });
    }
  }
  let violParentsFirst = 0;
  let violChildrenFirst = 0;
  let unresolvedEdges = 0;
  for (const e of edges) {
    const pSrc = pos.get(e.src);
    const pTgt = pos.get(e.tgt);
    if (pSrc === undefined || pTgt === undefined) {
      unresolvedEdges += 1;
      continue;
    }
    if (pTgt >= pSrc) violParentsFirst += 1;
    if (pSrc >= pTgt) violChildrenFirst += 1;
  }
  const topoOrientation = violParentsFirst === 0 ? 'referenced-tables-first (Kahn parents-first)' : violChildrenFirst === 0 ? 'referring-tables-first' : 'NEITHER';
  if (violParentsFirst > 0 && violChildrenFirst > 0) {
    c6Pass = false;
    addFinding('C6', 'NEW_STATIC_DISCREPANCY', `Layer 003 table order violates source FK DAG in both orientations: ${edges.length} edges, parents-first violations=${violParentsFirst}, children-first violations=${violChildrenFirst}`);
  }
  if (unresolvedEdges > 0) {
    addFinding('C6', 'INFO', `${unresolvedEdges} source-schema FK edges reference tables outside the Layer 003 set (external/legacy); excluded from order-violation counting`);
  }
  c6Details.push(
    `sequences-before-tables: ${seqBeforeTables}`,
    `008 sections ordered: ${sectionsOrdered}`,
    `topological check: ${edges.length} source FK edges, orientation=${topoOrientation}, violations=${Math.min(violParentsFirst, violChildrenFirst)}`
  );
  record('C6', 'Cross-layer dependency consistency', c6Pass, c6Details.join('; '));

  // --------------------------------------------------------------------------
  // C7 — DETERMINISTIC STRUCTURE (ratified sort rules + byte stability)
  // --------------------------------------------------------------------------
  let c7Pass = true;
  const c7Details: string[] = [];
  function assertSorted(label: string, values: string[]): void {
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1].localeCompare(values[i]) > 0) {
        c7Pass = false;
        addFinding('C7', 'NEW_STATIC_DISCREPANCY', `${label}: nondeterministic order at '${values[i - 1]}' > '${values[i]}'`);
        return;
      }
    }
  }
  assertSorted('001 extensions (by name)', layers[0].blocks.map((b) => bare(b.object)));
  assertSorted('002 types (by name)', layers[1].blocks.map((b) => bare(b.object)));
  const seqBlocks = l3.blocks.filter((b) => kindOf(b.region) === 'sequence');
  assertSorted('003 sequences (by name)', seqBlocks.map((b) => bare(b.object)));
  const fkKeys = layers[3].blocks.map((b) => {
    const p = fkParts(b.region);
    return `${p.src ?? ''}.${p.constraint ?? ''}`;
  });
  const fkSorted = [...fkKeys].sort((a, b) => {
    const [aT, aC] = [a.slice(0, a.lastIndexOf('.')), a.slice(a.lastIndexOf('.') + 1)];
    const [bT, bC] = [b.slice(0, b.lastIndexOf('.')), b.slice(b.lastIndexOf('.') + 1)];
    const c = aT.localeCompare(bT);
    return c !== 0 ? c : aC.localeCompare(bC);
  });
  if (JSON.stringify(fkKeys) !== JSON.stringify(fkSorted)) {
    c7Pass = false;
    addFinding('C7', 'NEW_STATIC_DISCREPANCY', '004 FKs not sorted by (source table, constraint name) per ratified rule');
  }
  const idxKeys = layers[4].blocks.map((b) => {
    const p = indexParts(b.region);
    return `${p.table ?? ''}.${p.name ?? ''}`;
  });
  const idxSorted = [...idxKeys].sort((a, b) => {
    const c = a.slice(0, a.lastIndexOf('.')).localeCompare(b.slice(0, b.lastIndexOf('.')));
    return c !== 0 ? c : a.slice(a.lastIndexOf('.') + 1).localeCompare(b.slice(b.lastIndexOf('.') + 1));
  });
  if (JSON.stringify(idxKeys) !== JSON.stringify(idxSorted)) {
    c7Pass = false;
    addFinding('C7', 'NEW_STATIC_DISCREPANCY', '005 indexes not sorted by (table, index name) per ratified rule');
  }
  assertSorted('006 functions (by name)', layers[5].blocks.map((b) => bare(b.object)));
  const trgKeys = layers[6].blocks.map((b) => {
    const p = triggerParts(b.region);
    return `${p.table ?? ''}.${p.name ?? ''}`;
  });
  const trgSorted = [...trgKeys].sort((a, b) => {
    const c = a.slice(0, a.lastIndexOf('.')).localeCompare(b.slice(0, b.lastIndexOf('.')));
    return c !== 0 ? c : a.slice(a.lastIndexOf('.') + 1).localeCompare(b.slice(b.lastIndexOf('.') + 1));
  });
  if (JSON.stringify(trgKeys) !== JSON.stringify(trgSorted)) {
    c7Pass = false;
    addFinding('C7', 'NEW_STATIC_DISCREPANCY', '007 triggers not sorted by (table, trigger name) per ratified rule');
  }
  assertSorted('008 Section 1 ENABLE RLS (by table)', l8.blocks.filter((b) => kindOf(b.region) === 'enable_rls').map((b) => enableTable(b.region) ?? ''));
  const polKeys = l8.blocks.filter((b) => kindOf(b.region) === 'policy').map((b) => {
    const p = policyParts(b.region);
    return `${p.table ?? ''}.${p.name ?? ''}`;
  });
  const polSorted = [...polKeys].sort((a, b) => {
    const c = a.slice(0, a.lastIndexOf('.')).localeCompare(b.slice(0, b.lastIndexOf('.')));
    return c !== 0 ? c : a.slice(a.lastIndexOf('.') + 1).localeCompare(b.slice(b.lastIndexOf('.') + 1));
  });
  if (JSON.stringify(polKeys) !== JSON.stringify(polSorted)) {
    c7Pass = false;
    addFinding('C7', 'NEW_STATIC_DISCREPANCY', '008 policies not sorted by (table, policy name) per ratified rule');
  }
  c7Details.push('ratified sort rules verified for 001/002/003-seq/004/005/006/007/008');
  record('C7', 'Deterministic structure (sort rules)', c7Pass, c7Pass ? c7Details.join('; ') : c7Details.join('; ') + '; see findings');

  // --------------------------------------------------------------------------
  // C8 — MIGRATION-TO-SOURCE-SCHEMA TRACEABILITY (both directions)
  // --------------------------------------------------------------------------
  let c8Pass = true;
  const c8Details: string[] = [];
  const sourceCache = new Map<string, string>();
  function readSource(rel: string): string {
    if (!sourceCache.has(rel)) {
      const full = path.join(root, rel);
      sourceCache.set(rel, fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '');
    }
    return sourceCache.get(rel) as string;
  }
  let forwardTraced = 0;
  let forwardMisses = 0;
  for (const layer of layers) {
    for (const block of layer.blocks) {
      const kind = kindOf(block.region);
      let token = bare(block.object);
      if (kind === 'fk') token = fkParts(block.region).constraint ?? token;
      if (kind === 'policy') token = policyParts(block.region).name ?? token;
      if (kind === 'index') token = indexParts(block.region).name ?? token;
      if (kind === 'trigger') token = triggerParts(block.region).name ?? token;
      if (kind === 'enable_rls') token = enableTable(block.region) ?? token;
      const srcContent = readSource(block.source);
      if (srcContent.includes(token)) forwardTraced += 1;
      else {
        forwardMisses += 1;
        addFinding('C8', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename}: object '${block.object}' token '${token}' not found in cited source ${block.source}`);
      }
    }
  }
  if (forwardMisses > 0) c8Pass = false;
  // Reverse direction: source categories in ratified scope must be fully represented.
  function sourceTableNames(dir: string): Set<string> {
    const names = new Set<string>();
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\."?([A-Za-z0-9_]+)"?/i);
      names.add(m?.[1] ?? f.replace(/\.sql$/, ''));
    }
    return names;
  }
  function sourceObjectNames(dir: string, re: RegExp): Set<string> {
    const names = new Set<string>();
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql'))) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = content.match(re);
      names.add(m?.[1] ?? f.replace(/\.sql$/, ''));
    }
    return names;
  }
  const revChecks: Array<{ label: string; source: Set<string>; artifact: Set<string> }> = [
    { label: 'tables', source: sourceTableNames(path.join(schemasDir, 'public', 'tables')), artifact: tableSet },
    { label: 'sequences', source: sourceObjectNames(path.join(schemasDir, 'public', 'sequences'), /CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\."?([A-Za-z0-9_]+)"?/i), artifact: seqSet },
    {
      label: 'types',
      source: sourceObjectNames(path.join(schemasDir, 'public', 'types'), /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\."?([A-Za-z0-9_]+)"?/i),
      artifact: new Set(layers[1].blocks.map((b) => bare(b.object))),
    },
    {
      label: 'functions',
      source: sourceObjectNames(path.join(schemasDir, 'public', 'functions'), /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?public"?\."?([A-Za-z0-9_]+)"?/i),
      artifact: fnSet,
    },
  ];
  for (const rc of revChecks) {
    const missingInArtifact = [...rc.source].filter((n) => !rc.artifact.has(n)).sort();
    const extraInArtifact = [...rc.artifact].filter((n) => !rc.source.has(n)).sort();
    if (missingInArtifact.length > 0 || extraInArtifact.length > 0) {
      c8Pass = false;
      addFinding('C8', 'NEW_STATIC_DISCREPANCY', `reverse traceability (${rc.label}): missing-in-baseline=[${missingInArtifact.slice(0, 10).join(', ')}], extra-in-baseline=[${extraInArtifact.slice(0, 10).join(', ')}]`);
    }
    c8Details.push(`${rc.label}: ${rc.source.size} source <-> ${rc.artifact.size} artifact`);
  }
  // Ratified-scope exclusions (recorded as INFO, not discrepancies).
  const viewCount = fs.readdirSync(path.join(schemasDir, 'public', 'views')).filter((f) => f.endsWith('.sql')).length;
  addFinding('C8', 'INFO', `${viewCount} source views, 2 storage tables, and 1 auth table lie OUTSIDE the ratified 8-layer baseline scope (D8-30/D8-11 inventory has no views/storage/auth layer); recorded as scope observation, not discrepancy`);
  record('C8', 'Migration-to-source-schema traceability', c8Pass, c8Pass
    ? `forward: ${forwardTraced}/${totalObjects} objects trace to cited source files; reverse: ${c8Details.join('; ')}`
    : `forward misses=${forwardMisses}; ${c8Details.join('; ')}`);

  // --------------------------------------------------------------------------
  // C9 — PROTECTION / FREEZE STATUS OF D8-33 BASELINE ARTIFACTS
  // --------------------------------------------------------------------------
  let c9Pass = true;
  const c9Details: string[] = [];
  let actualTotalBytes = 0;
  for (const layer of layers) actualTotalBytes += layer.bytes;
  const d833Path = path.join(root, 'docs', 'architecture', 'SENTRALOGIS_D8_33_IMPLEMENTATION_EXECUTION.md');
  const docRows = new Map<string, { size: number; hash: string }>();
  if (fs.existsSync(d833Path)) {
    const d833 = fs.readFileSync(d833Path, 'utf8');
    const rowRe = /\|\s*\*\*(\d{3})\*\*\s*\|\s*`supabase\/migrations\/([^`]+)`\s*\|\s*[\d,]+\s*\|\s*([\d,]+)\s*\|\s*`([0-9a-f]{64})`\s*\|/g;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(d833)) !== null) {
      docRows.set(rm[2], { size: Number(rm[3].replace(/,/g, '')), hash: rm[4] });
    }
  } else {
    c9Pass = false;
    addFinding('C9', 'NEW_STATIC_DISCREPANCY', 'D8-33 implementation record missing on disk');
  }
  let sizeMatches = 0;
  let hashPrefixMatches = 0;
  for (const layer of layers) {
    const doc = docRows.get(layer.def.filename);
    if (!doc) {
      addFinding('C9', 'NEW_STATIC_DISCREPANCY', `no D8-33 documented row for ${layer.def.filename}`);
      c9Pass = false;
      continue;
    }
    if (doc.size === layer.bytes) sizeMatches += 1;
    else addFinding('C9', 'ACCEPTED_CLOSED_D8_35', `D8-34-DISC-02 re-encounter: ${layer.def.filename} documented size ${doc.size} vs on-disk ${layer.bytes} bytes (ACCEPTED by D8-35 as documentation discrepancy; on-disk authoritative; NOT reopened)`);
    if (doc.hash === layer.sha256) hashPrefixMatches += 1;
    else if (doc.hash.slice(0, 12) === layer.sha256.slice(0, 12)) {
      hashPrefixMatches += 1;
      addFinding('C9', 'ACCEPTED_CLOSED_D8_35', `D8-34-DISC-01 re-encounter: ${layer.def.filename} documented full SHA-256 differs beyond 12-char prefix (ACCEPTED by D8-35 as documentation discrepancy; prefix matches; NOT reopened)`);
    } else {
      c9Pass = false;
      addFinding('C9', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename} SHA-256 mismatch beyond documented 12-char prefix: documented=${doc.hash.slice(0, 12)} actual=${layer.sha256.slice(0, 12)}`);
    }
  }
  if (actualTotalBytes !== D8_34_ACTUAL_TOTAL_BYTES) {
    addFinding('C9', 'NEW_STATIC_DISCREPANCY', `on-disk aggregate ${actualTotalBytes} bytes != D8-34 audit fact ${D8_34_ACTUAL_TOTAL_BYTES} bytes (baseline drift)`);
    c9Pass = false;
  }
  if (actualTotalBytes !== D8_33_DOC_TOTAL_BYTES) {
    addFinding('C9', 'ACCEPTED_CLOSED_D8_35', `D8-34-DISC-02 re-encounter: D8-33 documented aggregate ${D8_33_DOC_TOTAL_BYTES} vs on-disk ${actualTotalBytes} (ACCEPTED by D8-35; NOT reopened)`);
  }
  let stable = true;
  for (const layer of layers) {
    const buf2 = fs.readFileSync(layer.path);
    if (sha256(buf2) !== layer.sha256 || buf2.length !== layer.bytes) {
      stable = false;
      addFinding('C9', 'NEW_STATIC_DISCREPANCY', `${layer.def.filename} changed during validation (not frozen)`);
    }
  }
  if (!stable) c9Pass = false;
  c9Details.push(
    `8/8 files present; on-disk aggregate ${actualTotalBytes} bytes == D8-34 audit fact`,
    `documented-size exact matches: ${sizeMatches}/8 (remainder = D8-34-DISC-02, ACCEPTED_CLOSED)`,
    `documented-hash matches: ${hashPrefixMatches}/8 (divergence = D8-34-DISC-01, ACCEPTED_CLOSED)`,
    `byte stability across double read: ${stable}`
  );
  record('C9', 'Protection / freeze status of D8-33 artifacts', c9Pass, c9Details.join('; '));

  // --------------------------------------------------------------------------
  // C10 — CLASSIFICATION OF FINDINGS + GOVERNANCE LINEAGE RECONCILIATION
  // --------------------------------------------------------------------------
  const lineage: Array<{ file: string; marker: string }> = [
    { file: 'SENTRALOGIS_D8_30_HUMAN_RATIFICATION_OF_UNIT_2_BASELINE_FORMATION.md', marker: 'RATIFY ALL 10 DECISIONS' },
    { file: 'SENTRALOGIS_D8_31_EXACT_IMPLEMENTATION_PATH_RATIFICATION.md', marker: 'generate-baseline-layers.ts' },
    { file: 'SENTRALOGIS_D8_33_IMPLEMENTATION_EXECUTION.md', marker: 'I AUTHORIZE SENTRALOGIS D8-33' },
    { file: 'SENTRALOGIS_D8_34_POST_EXECUTION_VALIDATION.md', marker: 'GREEN WITH QUALIFICATION' },
    { file: 'SENTRALOGIS_D8_35_HUMAN_GOVERNANCE_DECISION.md', marker: 'ACCEPTED AS DOCUMENTATION DISCREPANCY' },
    { file: 'SENTRALOGIS_D8_38_HUMAN_RATIFICATION_OF_UNIT_3_SCOPE.md', marker: 'FORENSIC' },
    { file: 'SENTRALOGIS_D8_39_EXACT_PATH_ARTIFACT_ALLOWLIST_RATIFICATION.md', marker: 'scripts/forensic-validate-baseline.ts' },
    { file: 'SENTRALOGIS_D8_40_HUMAN_GOVERNANCE_GATE_APPROVAL.md', marker: 'HUMAN GOVERNANCE GATE APPROVED' },
    { file: 'SENTRALOGIS_D8_41_HUMAN_IMPLEMENTATION_AUTHORIZATION.md', marker: 'I AUTHORIZE SENTRALOGIS D8-41' },
  ];
  let lineagePass = true;
  for (const l of lineage) {
    const full = path.join(root, 'docs', 'architecture', l.file);
    if (!fs.existsSync(full) || !fs.readFileSync(full, 'utf8').includes(l.marker)) {
      lineagePass = false;
      addFinding('C10', 'NEW_STATIC_DISCREPANCY', `governance lineage artifact missing or marker absent: ${l.file} ('${l.marker}')`);
    }
  }
  if (fs.existsSync(path.join(root, RETIRED_REPORT))) {
    lineagePass = false;
    addFinding('C10', 'NEW_STATIC_DISCREPANCY', `retired D8-42-prefixed forensic report filename exists: ${RETIRED_REPORT}`);
  }
  record('C10', 'Classification of findings & governance lineage', lineagePass, lineagePass
    ? 'D8-30/D8-31/D8-33/D8-34/D8-35/D8-38/D8-39/D8-40/D8-41 artifacts verified with status markers; retired D8-42-prefixed report absent; D8-35 accepted discrepancies classified ACCEPTED_CLOSED'
    : 'see findings');

  // --------------------------------------------------------------------------
  // OUTPUT — deterministic structured forensic evidence (stdout only)
  // --------------------------------------------------------------------------
  const newCount = findings.filter((f) => f.classification === 'NEW_STATIC_DISCREPANCY').length;
  const acceptedCount = findings.filter((f) => f.classification === 'ACCEPTED_CLOSED_D8_35').length;
  const infoCount = findings.filter((f) => f.classification === 'INFO').length;
  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const w = process.stdout.write.bind(process.stdout);
  w('============================================================\n');
  w('SENTRALOGIS UNIT 3 - STATIC FORENSIC EVIDENCE (D8-42 EXECUTION)\n');
  w('============================================================\n');
  w(`Baseline HEAD:        ${BASELINE_HEAD}\n`);
  w(`Executed:             ${new Date().toISOString()}\n`);
  w('Evidence basis:       static repository evidence / deterministic static analysis\n');
  w('Database/runtime:     NOT ACCESSED - runtime validation deferred; database/runtime validation not performed\n\n');
  w('--- LAYER INVENTORY (static DDL parsing) ---\n');
  w('Layer | Filename | Expected | Parsed | Bytes | SHA-256(12) | Status\n');
  for (const layer of layers) {
    const ok = layer.blocks.length === layer.def.expected;
    w(`${layer.def.id} | ${layer.def.filename} | ${layer.def.expected} | ${layer.blocks.length} | ${layer.bytes} | ${layer.sha256.slice(0, 12)} | ${ok ? 'MATCH' : 'MISMATCH'}\n`);
  }
  w(`TOTAL | 8 modular layer files | ${TOTAL_EXPECTED} | ${totalObjects} | ${actualTotalBytes} | - | ${totalObjects === TOTAL_EXPECTED ? 'MATCH' : 'MISMATCH'}\n\n`);
  w('--- CHECK MATRIX ---\n');
  for (const c of checks) w(`${c.id} | ${c.name} | ${c.status} | ${c.detail}\n`);
  w('\n--- FINDINGS ---\n');
  if (findings.length === 0) w('NONE\n');
  for (const f of findings) w(`${f.id} | ${f.check} | ${f.classification} | ${f.evidence}\n`);
  w('\n--- SUMMARY ---\n');
  w(`Checks PASS:                     ${passCount}/${checks.length}\n`);
  w(`Findings NEW:                    ${newCount}\n`);
  w(`Findings ACCEPTED_CLOSED (D8-35): ${acceptedCount}\n`);
  w(`Findings INFO:                   ${infoCount}\n`);
  w('Remediation performed:           0 (report-only; no fix applied)\n');
  w('Boundary:                        No files written by this tool; no SQL; no database; no Docker; no CI; no deployment; no commit.\n');
  w('============================================================\n');
  w('END UNIT 3 STATIC FORENSIC EVIDENCE\n');
  w('============================================================\n');
}

main();
