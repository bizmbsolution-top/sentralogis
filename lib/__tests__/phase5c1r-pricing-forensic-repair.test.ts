import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function fileExists(relPath: string): boolean {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs);
}

describe('Phase 5C-1R Forensic Repair', () => {
  // =========================================================================
  // Finding 1: Tenant Relational Lineage
  // =========================================================================
  describe('Tenant Relational Lineage', () => {
    test('composite FK constraints exist', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/fk_pricing_rate_versions_rate_tenant/);
      expect(migration).toMatch(/fk_pricing_rate_items_version_tenant/);
    });

    test('composite UNIQUE constraints exist for FK reference', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/uq_pricing_rates_id_tenant UNIQUE \(id, tenant_id\)/);
      expect(migration).toMatch(/uq_pricing_rate_versions_id_tenant UNIQUE \(id, tenant_id\)/);
    });

    test('composite FK references parent (id, tenant_id)', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/REFERENCES public.pricing_rates\(id, tenant_id\)/);
      expect(migration).toMatch(/REFERENCES public.pricing_rate_versions\(id, tenant_id\)/);
    });
  });

  // =========================================================================
  // Finding 2: Version Number Authority
  // =========================================================================
  describe('Version Number Authority', () => {
    test('database function exists for version allocation', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public.next_pricing_rate_version/);
    });

    test('function uses SELECT FOR UPDATE for concurrency safety', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/FOR UPDATE/);
    });

    test('repository uses the database function', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toMatch(/next_pricing_rate_version/);
      expect(repo).not.toMatch(/maxVersion/);
    });

    test('no MAX(version_no) + 1 pattern remains', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).not.toMatch(/MAX\(version_no\)/);
    });
  });

  // =========================================================================
  // Finding 3: ACTIVE Version Invariant
  // =========================================================================
  describe('ACTIVE Version Invariant', () => {
    test('partial unique index exists for ACTIVE versions', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/uq_pricing_rate_versions_active/);
      expect(migration).toMatch(/WHERE status = 'ACTIVE'/);
    });

    test('index is scoped to (rate_id, tenant_id)', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/ON public.pricing_rate_versions\(rate_id, tenant_id\)/
);
    });
  });

  // =========================================================================
  // Finding 4: Effective Period Integrity
  // =========================================================================
  describe('Effective Period Integrity', () => {
    test('CHECK constraint ensures effective_from <= effective_to', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/chk_pricing_rate_versions_effective_period/);
      expect(migration).toMatch(/effective_to IS NULL OR effective_from <= effective_to/);
    });
  });

  // =========================================================================
  // Finding 5: Currency Explicitness
  // =========================================================================
  describe('Currency Explicitness', () => {
    test('DEFAULT IDR removed from currency column', () => {
      const repair = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(repair).toMatch(/ALTER COLUMN currency DROP DEFAULT/);
    });

    test('repository does not default currency to IDR', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).not.toMatch(/currency: input\.currency \?\? 'IDR'/);
      expect(repo).toMatch(/currency: input\.currency/);
    });

    test('input DTO requires currency', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).toMatch(/currency: string/);
      expect(types).not.toMatch(/currency\?: string/);
    });
  });

  // =========================================================================
  // Finding 6: Rate vs Version Lifecycle
  // =========================================================================
  describe('Rate vs Version Lifecycle', () => {
    test('rate status comment documents semantics', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/Rate-level lifecycle/);
    });

    test('version status comment documents semantics', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/Version-level lifecycle/);
    });

    test('valid combination: Rate=ACTIVE + Version=DRAFT documented', () => {
      const migration = readFile('supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql');
      expect(migration).toMatch(/Rate=ACTIVE \+ Version=DRAFT/);
    });
  });

  // =========================================================================
  // Security Verification
  // =========================================================================
  describe('Security', () => {
    test('no client tenant authority in pricing code', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).not.toMatch(/body\.tenant_id/);
      expect(repo).not.toMatch(/x-tenant-id/);
    });

    test('IdentityContext is authoritative for tenant', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toMatch(/ctx\.tenantId/);
    });

    test('assertPermission guards mutations', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toMatch(/assertPermission\(ctx, 'commercial:manage'\)/);
    });

    test('assertPermission guards reads', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toMatch(/assertPermission\(ctx, 'commercial:read'\)/);
    });
  });

  // =========================================================================
  // Regression: Original 5C-1 tests still pass
  // =========================================================================
  describe('Regression', () => {
    test('canonical pricing namespace still exists', () => {
      expect(fileExists('lib/pricing/types.ts')).toBe(true);
      expect(fileExists('lib/pricing/service.ts')).toBe(true);
      expect(fileExists('lib/pricing/repository.ts')).toBe(true);
    });

    test('no SBU-specific pricing authority introduced', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).not.toContain('forwarding_rates');
      expect(types).not.toContain('trucking_rates');
    });
  });
});
