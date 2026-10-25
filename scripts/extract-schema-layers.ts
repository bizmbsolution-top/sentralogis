/**
 * SENTRALOGIS D8-27
 * Delivery Unit 1 — Schema Extraction & Decomposition Tooling
 *
 * Authority:
 * - D8-02 Option B2: Ratified Modular Layered Baseline
 * - D8-11 Option C: Ratified Governed Baseline Formation
 * - D8-21 Decision 1: Option A Phased Delivery Unit Model
 * - D8-24: Ratified Unit 1 Scope
 * - D8-25: Ratified Exact Path (scripts/extract-schema-layers.ts)
 * - D8-26: Human Implementation Authorization Established
 *
 * Purpose:
 * Deterministic static schema extraction and DDL statement segregation
 * into ratified D8-02 Option B2 layers from static repository schema inputs
 * (supabase/schemas/**).
 *
 * Evidence Qualification & Boundary:
 * This script operates strictly offline and performs static repository schema analysis.
 * It analyzes static DDL text and derives static dependency information.
 * It DOES NOT claim or prove live PostgreSQL execution order, runtime database dependencies,
 * live RLS behavior, live constraint enforcement, container replay, or CI correctness.
 * Zero database connections, zero migration mutations, zero disk writes to the repository.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

// ============================================================================
// RATIFIED ARCHITECTURAL CONSTANTS (D8-02 Option B2)
// ============================================================================

export const RATIFIED_B2_LAYERS = [
  { id: '001', name: 'Extensions', description: 'PostgreSQL extensions' },
  { id: '002', name: 'Types / Enums', description: 'User-defined composite types and enums' },
  { id: '003', name: 'Tables', description: 'Base tables, sequences, and core structural columns' },
  { id: '004', name: 'Constraints', description: 'Foreign keys and cross-table constraints' },
  { id: '005', name: 'Indexes', description: 'Explicit standalone performance and secondary indexes' },
  { id: '006', name: 'Functions', description: 'Stored procedures and trigger functions' },
  { id: '007', name: 'Triggers', description: 'Table triggers and audit bindings' },
  { id: '008', name: 'RLS', description: 'Row Level Security enablement and access policies' },
] as const;

export type B2LayerId = (typeof RATIFIED_B2_LAYERS)[number]['id'];

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export type ObjectType =
  | 'extension'
  | 'type'
  | 'sequence'
  | 'table'
  | 'constraint'
  | 'index'
  | 'function'
  | 'trigger'
  | 'rls_enable'
  | 'policy'
  | 'view';

export interface ExtractedObject {
  layerId: B2LayerId;
  layerName: string;
  objectType: ObjectType;
  name: string;
  tableName?: string;
  sourceFile: string;
  sourceLine: number;
  statement: string;
  dependencies: string[];
}

export interface ForeignKeyInfo {
  constraintName: string;
  sourceTable: string;
  sourceColumns: string[];
  targetTable: string;
  targetColumns: string[];
  onDelete?: string;
  onUpdate?: string;
  sourceFile: string;
  isSelfReferencing: boolean;
  isExternalAuth: boolean;
}

export interface ExtractionResult {
  scanTimestamp: string;
  inputDirectory: string;
  totalFilesProcessed: number;
  objectsByLayer: Record<B2LayerId, ExtractedObject[]>;
  foreignKeys: ForeignKeyInfo[];
  allTables: string[];
  topologicalOrder: string[];
  hasDependencyCycles: boolean;
  cycleDetails: string[];
  accounting: {
    extensionsCount: number;
    typesCount: number;
    tablesCount: number;
    foreignKeysCount: number;
    explicitIndexesCount: number;
    functionsCount: number;
    triggersCount: number;
    rlsEnabledTablesCount: number;
    policiesCount: number;
  };
}

// ============================================================================
// STATIC REPOSITORY DISCOVERY
// ============================================================================

/**
 * Deterministically walk directory and discover SQL files, sorted alphabetically.
 */
function discoverSqlFiles(dir: string, baseDir: string = dir): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  // Deterministic sorting across platforms
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...discoverSqlFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      // Normalize to repo-relative path with forward slashes
      const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      results.push(relPath);
    }
  }

  return results;
}

// ============================================================================
// DDL EXTRACTION & B2 SEGREGATION ENGINE
// ============================================================================

/**
 * Parse and extract schema layers from static repository files.
 */
export function extractSchemaLayers(schemaRootDir: string = 'supabase/schemas'): ExtractionResult {
  const scanTimestamp = new Date().toISOString();
  const allSqlFiles = discoverSqlFiles(schemaRootDir);

  const objectsByLayer: Record<B2LayerId, ExtractedObject[]> = {
    '001': [],
    '002': [],
    '003': [],
    '004': [],
    '005': [],
    '006': [],
    '007': [],
    '008': [],
  };

  const foreignKeys: ForeignKeyInfo[] = [];
  const allTablesSet = new Set<string>();
  const rlsEnabledTablesSet = new Set<string>();

  for (const relPath of allSqlFiles) {
    const content = fs.readFileSync(relPath, 'utf8');
    const lines = content.split(/\r?\n/);

    // ------------------------------------------------------------------------
    // Layer 001: Extensions (_cluster/extensions/*.sql or CREATE EXTENSION)
    // ------------------------------------------------------------------------
    if (relPath.includes('_cluster/extensions') || /CREATE\s+EXTENSION/i.test(content)) {
      const extMatch = content.match(/CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([a-zA-Z0-9_\-]+)["']?/i);
      if (extMatch) {
        const extName = extMatch[1];
        objectsByLayer['001'].push({
          layerId: '001',
          layerName: 'Extensions',
          objectType: 'extension',
          name: extName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: content.trim(),
          dependencies: [],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Layer 002: Types / Enums (public/types/*.sql or CREATE TYPE)
    // ------------------------------------------------------------------------
    if (relPath.includes('public/types') || /CREATE\s+TYPE/i.test(content)) {
      const typeMatch = content.match(/CREATE\s+TYPE\s+(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s+AS/i);
      if (typeMatch) {
        const typeName = typeMatch[1];
        objectsByLayer['002'].push({
          layerId: '002',
          layerName: 'Types / Enums',
          objectType: 'type',
          name: typeName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: content.trim(),
          dependencies: [],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Layer 003: Sequences (public/sequences/*.sql)
    // ------------------------------------------------------------------------
    if (relPath.includes('public/sequences') || /CREATE\s+SEQUENCE/i.test(content)) {
      const seqMatch = content.match(/CREATE\s+SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?/i);
      if (seqMatch) {
        const seqName = seqMatch[1];
        objectsByLayer['003'].push({
          layerId: '003',
          layerName: 'Tables',
          objectType: 'sequence',
          name: seqName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: content.trim(),
          dependencies: [],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Layer 006: Functions (public/functions/*.sql or CREATE FUNCTION)
    // ------------------------------------------------------------------------
    if (relPath.includes('public/functions') || /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i.test(content)) {
      const fnMatch = content.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s*\(/i);
      if (fnMatch) {
        const fnName = fnMatch[1];
        objectsByLayer['006'].push({
          layerId: '006',
          layerName: 'Functions',
          objectType: 'function',
          name: fnName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: content.trim(),
          dependencies: [],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Tables file processing: public/tables/*.sql
    // ------------------------------------------------------------------------
    if (relPath.includes('public/tables') || /CREATE\s+TABLE/i.test(content)) {
      // Extract Table Name
      const tableMatch = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?([a-zA-Z0-9_]+)"?\s*\(/i);
      const tableName = tableMatch ? tableMatch[1] : path.basename(relPath, '.sql');
      allTablesSet.add(tableName);

      // Record Table in Layer 003
      objectsByLayer['003'].push({
        layerId: '003',
        layerName: 'Tables',
        objectType: 'table',
        name: tableName,
        tableName,
        sourceFile: relPath,
        sourceLine: 1,
        statement: extractBaseTableDdl(content, tableName),
        dependencies: [],
      });

      // Extract Foreign Keys (Layer 004 Constraints)
      const fkList = extractForeignKeysFromTableDdl(content, tableName, relPath);
      for (const fk of fkList) {
        foreignKeys.push(fk);
        objectsByLayer['004'].push({
          layerId: '004',
          layerName: 'Constraints',
          objectType: 'constraint',
          name: fk.constraintName,
          tableName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: formatStandaloneForeignKey(fk),
          dependencies: [fk.targetTable],
        });
      }

      // Extract Standalone Indexes (Layer 005 Indexes)
      const indexes = extractIndexesFromDdl(content, tableName, relPath);
      for (const idx of indexes) {
        objectsByLayer['005'].push(idx);
      }

      // Extract Triggers (Layer 007 Triggers)
      const triggers = extractTriggersFromDdl(content, tableName, relPath);
      for (const trg of triggers) {
        objectsByLayer['007'].push(trg);
      }

      // Extract RLS & Policies (Layer 008 RLS)
      if (/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(content)) {
        rlsEnabledTablesSet.add(tableName);
        objectsByLayer['008'].push({
          layerId: '008',
          layerName: 'RLS',
          objectType: 'rls_enable',
          name: `${tableName}_rls_enable`,
          tableName,
          sourceFile: relPath,
          sourceLine: 1,
          statement: `ALTER TABLE "public"."${tableName}" ENABLE ROW LEVEL SECURITY;`,
          dependencies: [tableName],
        });
      }

      const policies = extractPoliciesFromDdl(content, tableName, relPath);
      for (const pol of policies) {
        objectsByLayer['008'].push(pol);
      }
    }
  }

  const allTables = Array.from(allTablesSet).sort();

  // Perform deterministic topological sort and cycle detection
  const { topologicalOrder, hasDependencyCycles, cycleDetails } = computeTopologicalOrder(allTables, foreignKeys);

  return {
    scanTimestamp,
    inputDirectory: schemaRootDir,
    totalFilesProcessed: allSqlFiles.length,
    objectsByLayer,
    foreignKeys,
    allTables,
    topologicalOrder,
    hasDependencyCycles,
    cycleDetails,
    accounting: {
      extensionsCount: objectsByLayer['001'].length,
      typesCount: objectsByLayer['002'].length,
      tablesCount: allTables.length,
      foreignKeysCount: foreignKeys.length,
      explicitIndexesCount: objectsByLayer['005'].length,
      functionsCount: objectsByLayer['006'].length,
      triggersCount: objectsByLayer['007'].length,
      rlsEnabledTablesCount: rlsEnabledTablesSet.size,
      policiesCount: objectsByLayer['008'].filter((o) => o.objectType === 'policy').length,
    },
  };
}

// ============================================================================
// DDL PARSING HELPERS
// ============================================================================

/**
 * Extract clean base CREATE TABLE definition without external constraints,
 * consolidating any authoritative ALTER TABLE ... ADD COLUMN definitions in-place.
 */
function extractBaseTableDdl(fullContent: string, tableName: string): string {
  const createTableRegex = new RegExp(
    `CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:"?public"?\\.)?"?${tableName}"?\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );
  const match = fullContent.match(createTableRegex);
  if (!match) {
    return `-- Base table definition for ${tableName}`;
  }

  const rawTableDdl = match[0].trim();
  const rawBody = match[1];

  // Extract all ALTER TABLE <tableName> ADD COLUMN ... statements
  const addCols: string[] = [];
  const addColRegex = new RegExp(
    `ALTER\\s+TABLE\\s+(?:"?public"?\\.)?"?${tableName}"?\\s+ADD\\s+COLUMN\\s+([^;]+);`,
    'gi'
  );
  let colMatch: RegExpExecArray | null;
  while ((colMatch = addColRegex.exec(fullContent)) !== null) {
    addCols.push(colMatch[1].trim());
  }

  if (addCols.length === 0) {
    return rawTableDdl;
  }

  // Insert added columns into table body before first CONSTRAINT or at the end of columns
  const bodyLines = rawBody.split(/\r?\n/);
  let insertIdx = -1;
  for (let i = 0; i < bodyLines.length; i++) {
    if (/^\s*CONSTRAINT\s+/i.test(bodyLines[i])) {
      insertIdx = i;
      break;
    }
  }

  const formattedAddCols = addCols.map((c) => `  ${c},`);

  if (insertIdx !== -1) {
    let prevNonEmpty = insertIdx - 1;
    while (prevNonEmpty >= 0 && bodyLines[prevNonEmpty].trim() === '') prevNonEmpty--;
    if (prevNonEmpty >= 0 && !/,\s*$/.test(bodyLines[prevNonEmpty])) {
      bodyLines[prevNonEmpty] = bodyLines[prevNonEmpty].trimEnd() + ',';
    }
    bodyLines.splice(insertIdx, 0, ...formattedAddCols);
  } else {
    let lastNonEmpty = bodyLines.length - 1;
    while (lastNonEmpty >= 0 && bodyLines[lastNonEmpty].trim() === '') lastNonEmpty--;
    if (lastNonEmpty >= 0 && !/,\s*$/.test(bodyLines[lastNonEmpty])) {
      bodyLines[lastNonEmpty] = bodyLines[lastNonEmpty].trimEnd() + ',';
    }
    bodyLines.push(...formattedAddCols);
  }

  const header = `CREATE TABLE "public"."${tableName}" (`;
  return `${header}\n${bodyLines.join('\n')}\n);`;
}

/**
 * Extract Foreign Key constraint details from table DDL.
 */
function extractForeignKeysFromTableDdl(
  content: string,
  sourceTable: string,
  sourceFile: string
): ForeignKeyInfo[] {
  const fks: ForeignKeyInfo[] = [];

  // Match: CONSTRAINT "<name>" FOREIGN KEY (<cols>) REFERENCES [public.]<target>(<cols>) [ON DELETE ...]
  const fkRegex =
    /CONSTRAINT\s+"?([a-zA-Z0-9_]+)"?\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(?:public\.)?"?([a-zA-Z0-9_.]+)"?\s*(?:\(([^)]+)\))?(?:\s+ON\s+DELETE\s+([a-zA-Z\s]+?))?(?:\s+ON\s+UPDATE\s+([a-zA-Z\s]+?))?(?=[,\);\n])/gi;

  let match: RegExpExecArray | null;
  while ((match = fkRegex.exec(content)) !== null) {
    const constraintName = match[1];
    const sourceColumns = match[2].split(',').map((c) => c.trim().replace(/"/g, ''));
    let targetRaw = match[3].trim().replace(/"/g, '');
    let targetTable = targetRaw;
    let isExternalAuth = false;

    if (targetRaw.includes('auth.users')) {
      targetTable = 'auth.users';
      isExternalAuth = true;
    } else if (targetRaw.startsWith('public.')) {
      targetTable = targetRaw.replace('public.', '');
    }

    const targetColumns = match[4]
      ? match[4].split(',').map((c) => c.trim().replace(/"/g, ''))
      : ['id'];

    const onDelete = match[5]?.trim();
    const onUpdate = match[6]?.trim();
    const isSelfReferencing = targetTable === sourceTable;

    fks.push({
      constraintName,
      sourceTable,
      sourceColumns,
      targetTable,
      targetColumns,
      onDelete,
      onUpdate,
      sourceFile,
      isSelfReferencing,
      isExternalAuth,
    });
  }

  return fks;
}

/**
 * Format an extracted foreign key as a standalone ALTER TABLE statement for Layer 004.
 */
function formatStandaloneForeignKey(fk: ForeignKeyInfo): string {
  const targetRef = fk.isExternalAuth ? 'auth.users' : `public.${fk.targetTable}`;
  let stmt = `ALTER TABLE "public"."${fk.sourceTable}" ADD CONSTRAINT "${fk.constraintName}" FOREIGN KEY (${fk.sourceColumns.join(
    ', '
  )}) REFERENCES ${targetRef} (${fk.targetColumns.join(', ')})`;
  if (fk.onDelete) {
    stmt += ` ON DELETE ${fk.onDelete}`;
  }
  if (fk.onUpdate) {
    stmt += ` ON UPDATE ${fk.onUpdate}`;
  }
  stmt += ';';
  return stmt;
}

/**
 * Extract explicit CREATE INDEX statements from table DDL.
 */
function extractIndexesFromDdl(content: string, tableName: string, sourceFile: string): ExtractedObject[] {
  const results: ExtractedObject[] = [];
  const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+[^;]+;/gi;

  let match: RegExpExecArray | null;
  while ((match = indexRegex.exec(content)) !== null) {
    const indexName = match[1];
    results.push({
      layerId: '005',
      layerName: 'Indexes',
      objectType: 'index',
      name: indexName,
      tableName,
      sourceFile,
      sourceLine: 1,
      statement: match[0].trim(),
      dependencies: [tableName],
    });
  }

  return results;
}

/**
 * Extract explicit CREATE TRIGGER statements from table DDL.
 */
function extractTriggersFromDdl(content: string, tableName: string, sourceFile: string): ExtractedObject[] {
  const results: ExtractedObject[] = [];
  const triggerRegex =
    /CREATE\s+TRIGGER\s+([a-zA-Z0-9_]+)\s+[\s\S]*?ON\s+(?:public\.)?"?([a-zA-Z0-9_]+)"?[\s\S]*?EXECUTE\s+FUNCTION\s+([^;]+);/gi;

  let match: RegExpExecArray | null;
  while ((match = triggerRegex.exec(content)) !== null) {
    const triggerName = match[1];
    const fnTarget = match[3].trim().replace(/\(\)/, '');
    results.push({
      layerId: '007',
      layerName: 'Triggers',
      objectType: 'trigger',
      name: triggerName,
      tableName,
      sourceFile,
      sourceLine: 1,
      statement: match[0].trim(),
      dependencies: [tableName, fnTarget],
    });
  }

  return results;
}

/**
 * Extract explicit CREATE POLICY statements from table DDL.
 */
function extractPoliciesFromDdl(content: string, tableName: string, sourceFile: string): ExtractedObject[] {
  const results: ExtractedObject[] = [];
  const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+[^;]+;/gi;

  let match: RegExpExecArray | null;
  while ((match = policyRegex.exec(content)) !== null) {
    const policyName = match[1];
    results.push({
      layerId: '008',
      layerName: 'RLS',
      objectType: 'policy',
      name: `${tableName}_policy_${policyName}`,
      tableName,
      sourceFile,
      sourceLine: 1,
      statement: match[0].trim(),
      dependencies: [tableName],
    });
  }

  return results;
}

// ============================================================================
// TOPOLOGICAL SORTING & DEPENDENCY GRAPH ENGINE
// ============================================================================

/**
 * Deterministic topological sort over tables based on foreign key dependencies.
 * Uses Kahn's algorithm with alphabetical tie-breaking to ensure deterministic ordering.
 */
function computeTopologicalOrder(
  allTables: string[],
  foreignKeys: ForeignKeyInfo[]
): {
  topologicalOrder: string[];
  hasDependencyCycles: boolean;
  cycleDetails: string[];
} {
  const tableSet = new Set(allTables);
  const inDegree: Map<string, number> = new Map();
  const graph: Map<string, Set<string>> = new Map(); // target -> set of tables that depend on target

  for (const t of allTables) {
    inDegree.set(t, 0);
    graph.set(t, new Set());
  }

  // Cross-table dependency edges
  // If table A has FK pointing to table B, table B must be created before table A.
  // In Kahn's algorithm: edge is B -> A (B precedes A).
  for (const fk of foreignKeys) {
    if (fk.isSelfReferencing || fk.isExternalAuth) {
      continue;
    }
    if (tableSet.has(fk.targetTable) && tableSet.has(fk.sourceTable)) {
      const dependents = graph.get(fk.targetTable)!;
      if (!dependents.has(fk.sourceTable)) {
        dependents.add(fk.sourceTable);
        inDegree.set(fk.sourceTable, (inDegree.get(fk.sourceTable) || 0) + 1);
      }
    }
  }

  // Queue initial nodes with in-degree 0, sorted alphabetically
  const queue: string[] = allTables.filter((t) => inDegree.get(t) === 0).sort();
  const topologicalOrder: string[] = [];

  while (queue.length > 0) {
    // Deterministic: queue is kept sorted
    const current = queue.shift()!;
    topologicalOrder.push(current);

    const dependents = Array.from(graph.get(current) || []).sort();
    for (const dep of dependents) {
      const newDeg = (inDegree.get(dep) || 0) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) {
        // Insert into queue preserving alphabetical order
        queue.push(dep);
        queue.sort();
      }
    }
  }

  const hasDependencyCycles = topologicalOrder.length < allTables.length;
  const cycleDetails: string[] = [];

  if (hasDependencyCycles) {
    const cycleTables = allTables.filter((t) => (inDegree.get(t) || 0) > 0);
    cycleDetails.push(`Detected ${cycleTables.length} tables involved in cycles: ${cycleTables.join(', ')}`);
  }

  return {
    topologicalOrder,
    hasDependencyCycles,
    cycleDetails,
  };
}

// ============================================================================
// CLI RUNNER & AUDIT REPORTING
// ============================================================================

export function runExtractionAudit(): void {
  const args = process.argv.slice(2);
  const result = extractSchemaLayers('supabase/schemas');

  if (args.includes('--json')) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  process.stdout.write('============================================================\n');
  process.stdout.write('SENTRALOGIS D8-27 SCHEMA EXTRACTION AUDIT REPORT\n');
  process.stdout.write('============================================================\n\n');

  process.stdout.write(`Scan Timestamp:          ${result.scanTimestamp}\n`);
  process.stdout.write(`Input Source:            ${result.inputDirectory}/** (Static Repository DDL)\n`);
  process.stdout.write(`Total Schema Files:      ${result.totalFilesProcessed}\n\n`);

  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write('D8-02 OPTION B2 LAYER ACCOUNTING\n');
  process.stdout.write('------------------------------------------------------------\n');
  for (const layer of RATIFIED_B2_LAYERS) {
    const count = result.objectsByLayer[layer.id].length;
    process.stdout.write(`Layer ${layer.id} [${layer.name.padEnd(16)}]: ${count.toString().padStart(5)} objects\n`);
  }

  process.stdout.write('\n------------------------------------------------------------\n');
  process.stdout.write('INVENTORY RECONCILIATION AUDIT\n');
  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write(`Total Base Tables:       ${result.accounting.tablesCount} (Expected: 290)\n`);
  process.stdout.write(`Explicit Standalone Idx: ${result.accounting.explicitIndexesCount} (Expected: 520)\n`);
  process.stdout.write(`Foreign Key Constraints: ${result.accounting.foreignKeysCount} (Expected: 587)\n`);
  process.stdout.write(`Explicit Triggers:       ${result.accounting.triggersCount} (Expected: 68)\n`);
  process.stdout.write(`RLS-Enabled Tables:      ${result.accounting.rlsEnabledTablesCount} (Expected: 258)\n`);
  process.stdout.write(`Enums / Types:           ${result.accounting.typesCount} (Expected: 28)\n`);
  process.stdout.write(`Extensions:              ${result.accounting.extensionsCount} (Expected: 4)\n`);
  process.stdout.write(`Functions:               ${result.accounting.functionsCount} (Expected: 127)\n\n`);

  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write('TOPOLOGICAL SORTING & DEPENDENCY VALIDATION\n');
  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write(`Graph Nodes (Tables):    ${result.allTables.length}\n`);
  process.stdout.write(`Topologically Ordered:   ${result.topologicalOrder.length}\n`);
  process.stdout.write(`Dependency Cycles:       ${result.hasDependencyCycles ? 'DETECTED' : 'NONE (0 multi-node cycles)'}\n`);
  process.stdout.write(`Topological Status:      ${result.hasDependencyCycles ? 'FAIL' : 'PASS (Acyclic Directed Graph)'}\n\n`);

  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write('EVIDENCE QUALIFICATION\n');
  process.stdout.write('------------------------------------------------------------\n');
  process.stdout.write('Evidence Basis:          Static repository schema evidence (supabase/schemas/**)\n');
  process.stdout.write('PostgreSQL Runtime:      NOT ACCESSED (Offline static extraction only)\n');
  process.stdout.write('Database Mutation:       NONE\n');
  process.stdout.write('Migration Mutation:      NONE\n\n');
  process.stdout.write('============================================================\n');
  process.stdout.write('END D8-27 AUDIT REPORT\n');
  process.stdout.write('============================================================\n');
}

// Direct CLI invocation
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('extract-schema-layers.ts')) {
  runExtractionAudit();
}
