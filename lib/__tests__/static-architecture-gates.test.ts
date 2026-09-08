/**
 * Sentralogis — U-10 Static Architecture Gates
 *
 * Automated invariant checks enforced as a test suite. Any violation blocks the build.
 *
 * Gates:
 *   (a) No canonical-domain import of SBU execution modules
 *   (b) No browser `supabase.from()` inside canonical surfaces
 *   (c) Capability vocabulary sourced only from registry module
 *   (d) Customs imports remain outbound-null (no inbound coupling from other domains)
 *   (e) No `md_users` references resurrect in functional code
 */

import * as fs from 'fs';
import * as path from 'path';

export function runStaticArchitectureGatesSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  /**
   * Recursively collect all .ts files (excluding node_modules, .next, dist, test files).
   * Pure Node.js — no shell commands needed.
   */
  function collectTsFiles(dir: string, exclude: string[] = []): string[] {
    const skipDirs = new Set(['node_modules', '.next', 'dist', '.git', '__tests__']);
    const files: string[] = [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name) || exclude.includes(entry.name)) continue;
        files.push(...collectTsFiles(path.join(dir, entry.name), exclude));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && !entry.name.includes('.test.')) {
        files.push(path.join(dir, entry.name));
      }
    }
    return files;
  }

  /**
   * Recursively collect all .sql files (excluding node_modules, .next, dist).
   */
  function collectSqlFiles(dir: string): string[] {
    const skipDirs = new Set(['node_modules', '.next', 'dist', '.git']);
    const files: string[] = [];
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        files.push(...collectSqlFiles(path.join(dir, entry.name)));
      } else if (entry.name.endsWith('.sql')) {
        files.push(path.join(dir, entry.name));
      }
    }
    return files;
  }

  interface GrepHit { file: string; line: number; match: string }

  /**
   * Search for a regex pattern in collected files. Pure Node.js, cross-platform.
   */
  function grepFiles(collectedFiles: string[], pattern: RegExp): GrepHit[] {
    const hits: GrepHit[] = [];
    for (const filePath of collectedFiles) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
          hits.push({ file: relPath, line: i + 1, match: lines[i].trim().substring(0, 120) });
        }
      }
    }
    return hits;
  }

  // Pre-collect files once
  const cwd = process.cwd();
  const tsFiles = collectTsFiles(cwd);
  const sqlFiles = collectSqlFiles(cwd);

  // =========================================================================
  // GATE (a): No canonical-domain import of SBU execution modules
  //
  // Canonical surfaces: lib/domain/**, lib/application/**, src/domains/**, src/application/**
  // SBU execution modules: app/(dashboard)/sbu/**
  //
  // Rule: canonical code must never import from SBU execution paths.
  // =========================================================================
  assert('GATE-A-1', 'lib/domain/** has no imports from app/(dashboard)/sbu/', () => {
    const importPattern = /from\s+['"](?:@\/)?app\/(dashboard\/)?sbu\//;
    const violations = grepFiles(tsFiles, importPattern).filter(v =>
      v.file.startsWith('lib/domain/') || v.file.startsWith('src/domains/')
    );
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Canonical domain imports SBU execution modules:\n${details}`);
    }
  });

  assert('GATE-A-2', 'lib/application/** has no imports from app/(dashboard)/sbu/', () => {
    const importPattern = /from\s+['"](?:@\/)?app\/(dashboard\/)?sbu\//;
    const violations = grepFiles(tsFiles, importPattern).filter(v =>
      v.file.startsWith('lib/application/')
    );
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Application layer imports SBU execution modules:\n${details}`);
    }
  });

  // =========================================================================
  // GATE (b): No browser supabase client import inside canonical surfaces
  //
  // Canonical surfaces: lib/domain/**, lib/application/**
  // Exception: lib/domain/service-contracts/adapters/** (anti-corruption layer)
  //
  // Rule: canonical domain/application code must not import the BROWSER supabase
  //       client ('@/lib/supabase/client'). Server-side code uses supabaseAdmin
  //       ('@/lib/supabase/admin') which is allowed. The invariant enforces that
  //       canonical code never crosses the client/server authority boundary.
  // =========================================================================
  assert('GATE-B-1', 'lib/domain/** has no browser supabase client imports', () => {
    const browserClientImport = /from\s+['"](?:@\/)?lib\/supabase\/client['"]/;
    const knownExceptions: string[] = [];
    const violations = grepFiles(tsFiles, browserClientImport).filter(v => {
      if (!v.file.startsWith('lib/domain/')) return false;
      if (v.file.includes('lib/domain/service-contracts/adapters/')) return false;
      if (knownExceptions.includes(v.file)) return false;
      return true;
    });
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Canonical domain imports browser supabase client:\n${details}`);
    }
  });

  assert('GATE-B-2', 'lib/application/** has no browser supabase client imports', () => {
    const browserClientImport = /from\s+['"](?:@\/)?lib\/supabase\/client['"]/;
    const violations = grepFiles(tsFiles, browserClientImport).filter(v =>
      v.file.startsWith('lib/application/')
    );
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Application layer imports browser supabase client:\n${details}`);
    }
  });

  // =========================================================================
  // GATE (c): Capability vocabulary definitions are centralized
  //
  // The canonical capability codes ('CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE')
  // must be DEFINED only in the registry module and its authorized seams.
  // Usages (comparisons, switch cases, map keys) are allowed anywhere.
  //
  // We detect definitions by looking for type aliases or const arrays that
  // contain these codes as string literals in a definition context.
  //
  // Allowed definition locations:
  //   - lib/application/capabilities/ (registry, types, sbu-adapter)
  //   - lib/domain/commercial/types.ts, capability-code-source.ts, capability-binding-service.ts
  //
  // NOT allowed: lib/domain/** (except commercial/**) defining new type aliases with these codes
  // =========================================================================
  assert('GATE-C-1', 'No new canonical capability type definitions outside authorized seams in lib/', () => {
    // Match patterns like: type X = 'CUSTOMS' | ... or const X = ['CUSTOMS', ...]
    const definitionPatterns = [
      /type\s+\w*[Cc]apabilit\w*\s*=\s*['"]/,
      /type\s+\w*[Cc]ode\w*\s*=\s*['"].*CUSTOMS/,
      /type\s+\w*[Cc]ode\w*\s*=\s*['"].*FORWARDING/,
      /type\s+\w*[Cc]ode\w*\s*=\s*['"].*TRUCKING/,
      /type\s+\w*[Cc]ode\w*\s*=\s*['"].*WAREHOUSE/,
      /(?:const|readonly)\s+\w*[Cc]apabilit\w*\s*[:=]\s*\[['"]CUSTOMS/,
      /(?:const|readonly)\s+\w*[Cc]ode\w*\s*[:=]\s*\[['"]CUSTOMS/,
      /(?:const|readonly)\s+\w*[Cc]ODE\w*\s*[:=]\s*\[['"]CUSTOMS/,
      /(?:const|readonly)\s+DEFAULT_CAPABILITY/,
      /(?:const|readonly)\s+CANONICAL_CAPABILITY/,
    ];
    const allowedPrefixes = [
      'lib/application/capabilities/',
      'lib/domain/commercial/',
    ];
    const violations: Array<{ file: string; line: number }> = [];

    for (const pattern of definitionPatterns) {
      const hits = grepFiles(tsFiles, pattern);
      for (const h of hits) {
        if (!h.file.startsWith('lib/')) continue;
        if (allowedPrefixes.some(p => h.file.startsWith(p))) continue;
        violations.push({ file: h.file, line: h.line });
      }
    }
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Capability vocabulary defined outside authorized seams:\n${details}`);
    }
  });

  // =========================================================================
  // GATE (d): Customs imports remain outbound-null
  //
  // No non-customs domain code should import from lib/domain/customs/**.
  // Customs is self-contained with zero inbound coupling from other domains.
  //
  // Allowed: lib/domain/customs/** (self-imports)
  // Allowed: lib/application/** (orchestration layer)
  // Allowed: app/**, components/** (routes and UI)
  // NOT Allowed: lib/domain/shipment/**, lib/domain/forwarding/**, etc.
  // =========================================================================
  assert('GATE-D-1', 'No non-customs domain modules import from lib/domain/customs/', () => {
    const customsImportPattern = /from\s+['"](?:@\/)?lib\/domain\/customs/;
    const violations = grepFiles(tsFiles, customsImportPattern).filter(v => {
      if (v.file.startsWith('lib/domain/customs/')) return false;
      if (v.file.startsWith('lib/application/')) return false;
      if (v.file.startsWith('app/')) return false;
      if (v.file.startsWith('components/')) return false;
      if (v.file.startsWith('src/')) return false;
      if (v.file.startsWith('lib/domain/')) return true;
      return false;
    });
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`Non-customs domain imports customs module (inbound coupling):\n${details}`);
    }
  });

  // =========================================================================
  // GATE (e): No `md_users` references resurrect
  //
  // The md_users table was eliminated in Stage R (erratum).
  // No functional TypeScript/SQL code should reference it.
  // Migration comments and documentation are excluded.
  // =========================================================================
  assert('GATE-E-1', 'No md_users references in functional TypeScript code', () => {
    const mdUsersPattern = /md_users/;
    const violations = grepFiles(tsFiles, mdUsersPattern);
    if (violations.length > 0) {
      const details = violations.map(v => `  ${v.file}:${v.line} — ${v.match.substring(0, 60)}`).join('\n');
      throw new Error(`md_users references resurrected in functional code:\n${details}`);
    }
  });

  assert('GATE-E-2', 'No md_users references in new migration SQL (post-012, excluding comments)', () => {
    const mdUsersPattern = /md_users/;
    const hits = grepFiles(sqlFiles, mdUsersPattern);
    const newMigViolations = hits.filter(v => {
      const match = v.file.match(/(\d{3})_/);
      if (!match) return false;
      const num = parseInt(match[1], 10);
      if (num <= 12) return false;
      // Exclude SQL comments (-- prefixed)
      if (v.match.trimStart().startsWith('--')) return false;
      return true;
    });
    if (newMigViolations.length > 0) {
      const details = newMigViolations.map(v => `  ${v.file}:${v.line}`).join('\n');
      throw new Error(`md_users references in post-erratum migrations:\n${details}`);
    }
  });

  return results;
}
