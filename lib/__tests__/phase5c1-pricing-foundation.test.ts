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

describe('Phase 5C-1 Pricing Foundation', () => {
  // =========================================================================
  // ARCHITECTURE TESTS
  // =========================================================================
  describe('Architecture', () => {
    test('canonical pricing domain namespace exists', () => {
      expect(fileExists('lib/pricing/types.ts')).toBe(true);
      expect(fileExists('lib/pricing/service.ts')).toBe(true);
      expect(fileExists('lib/pricing/repository.ts')).toBe(true);
    });

    test('no SBU-specific pricing authority introduced', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).not.toContain('forwarding_rates');
      expect(migration).not.toContain('trucking_rates');
      expect(migration).not.toContain('customs_rates');
      expect(migration).not.toContain('warehouse_rates');
    });

    test('single canonical pricing authority', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).toContain('PricingRate');
      expect(types).toContain('PricingRateVersion');
      expect(types).toContain('PricingRateItem');
    });
  });

  // =========================================================================
  // TENANT ISOLATION TESTS
  // =========================================================================
  describe('Tenant Isolation', () => {
    test('all pricing tables have RLS enabled', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/ALTER TABLE.*pricing_rates.*ENABLE ROW LEVEL SECURITY/);
      expect(migration).toMatch(/ALTER TABLE.*pricing_rate_versions.*ENABLE ROW LEVEL SECURITY/);
      expect(migration).toMatch(/ALTER TABLE.*pricing_rate_items.*ENABLE ROW LEVEL SECURITY/);
    });

    test('RLS policies use get_my_tenant_id()', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/tenant_id = get_my_tenant_id\(\)/);
    });

    test('repository uses IdentityContext tenant', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toContain('ctx.tenantId');
      expect(repo).not.toMatch(/body\.tenant_id/);
      expect(repo).not.toMatch(/tenant_id:\s*body\./);
    });
  });

  // =========================================================================
  // IDENTITY TESTS
  // =========================================================================
  describe('Identity', () => {
    test('repository asserts permission for mutations', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toContain("assertPermission(ctx, 'commercial:manage')");
    });

    test('repository asserts permission for reads', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toContain("assertPermission(ctx, 'commercial:read')");
    });

    test('input DTOs do not contain tenantId', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).not.toMatch(/CreatePricingRateInput[\s\S]*?tenantId/);
      expect(types).not.toMatch(/CreatePricingRateVersionInput[\s\S]*?tenantId/);
      expect(types).not.toMatch(/CreatePricingRateItemInput[\s\S]*?tenantId/);
    });
  });

  // =========================================================================
  // RATE IDENTITY TESTS
  // =========================================================================
  describe('Rate Identity', () => {
    test('rate has DB-generated UUID PK', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    });

    test('rate code is unique per tenant', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/CONSTRAINT uq_pricing_rate_code UNIQUE \(tenant_id, rate_code\)/);
    });

    test('capability type is constrained', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/capability_type TEXT NOT NULL CHECK \(capability_type IN \('FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE'\)\)/);
    });
  });

  // =========================================================================
  // RATE VERSION TESTS
  // =========================================================================
  describe('Rate Version', () => {
    test('versions are distinct per rate', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/CONSTRAINT uq_pricing_rate_version UNIQUE \(tenant_id, rate_id, version_no\)/);
    });

    test('effective period is defined', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/effective_from DATE NOT NULL/);
      expect(migration).toMatch(/effective_to DATE/);
    });

    test('version number is auto-incremented', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).toContain('nextVersion');
      expect(repo).toContain('maxVersion');
    });
  });

  // =========================================================================
  // BUY/SELL TESTS
  // =========================================================================
  describe('Buy/Sell', () => {
    test('buy/sell side is structurally distinct', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toContain("CREATE TYPE com_pricing_side AS ENUM");
      expect(migration).toContain("'SELL'");
      expect(migration).toContain("'BUY'");
    });

    test('rate items have side column', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/side com_pricing_side NOT NULL DEFAULT 'SELL'/);
    });

    test('buy and sell can coexist', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).toContain("'SELL'");
      expect(types).toContain("'BUY'");
    });
  });

  // =========================================================================
  // CURRENCY TESTS
  // =========================================================================
  describe('Currency', () => {
    test('currency is explicit on rate items', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/currency TEXT NOT NULL DEFAULT 'IDR'/);
    });

    test('no implicit currency assumption in types', () => {
      const types = readFile('lib/pricing/types.ts');
      expect(types).toContain("currency: string");
    });
  });

  // =========================================================================
  // UOM TESTS
  // =========================================================================
  describe('UOM', () => {
    test('UOM is explicit on rate items', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/unit_of_measure TEXT NOT NULL/);
    });

    test('charge basis is defined', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/charge_basis TEXT NOT NULL/);
    });
  });

  // =========================================================================
  // CONCURRENCY TESTS
  // =========================================================================
  describe('Concurrency', () => {
    test('authoritative identifiers are DB-generated UUIDs', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      const uuidMatches = migration.match(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/g);
      expect(uuidMatches?.length).toBeGreaterThanOrEqual(3);
    });

    test('unique constraints prevent duplicates', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/UNIQUE \(tenant_id, rate_code\)/);
      expect(migration).toMatch(/UNIQUE \(tenant_id, rate_id, version_no\)/);
    });
  });

  // =========================================================================
  // AUDIT TESTS
  // =========================================================================
  describe('Audit', () => {
    test('tables have created_at/updated_at', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
      expect(migration).toMatch(/updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
    });

    test('tables have created_by/updated_by', () => {
      const migration = readFile('supabase/migrations/20260901_025_pricing_foundation.sql');
      expect(migration).toMatch(/created_by UUID/);
      expect(migration).toMatch(/updated_by UUID/);
    });
  });

  // =========================================================================
  // SECURITY TESTS
  // =========================================================================
  describe('Security', () => {
    test('no trusted x-tenant-id in pricing code', () => {
      const repo = readFile('lib/pricing/repository.ts');
      const service = readFile('lib/pricing/service.ts');
      expect(repo).not.toContain('x-tenant-id');
      expect(service).not.toContain('x-tenant-id');
    });

    test('no body tenant authority in pricing code', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).not.toMatch(/body\.tenant_id/);
    });

    test('no fabricated authoritative IDs in pricing code', () => {
      const repo = readFile('lib/pricing/repository.ts');
      expect(repo).not.toMatch(/Math\.random\(\)/);
      expect(repo).not.toMatch(/crypto\.randomUUID/);
    });
  });
});
