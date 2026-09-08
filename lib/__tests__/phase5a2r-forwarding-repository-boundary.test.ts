import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function readAllMigrationContents(): string[] {
  const migDir = path.join(ROOT, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) return [];
  return fs.readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFile(path.join(migDir, f)));
}

describe('Phase 5A-2R Forwarding Repository Boundary Remediation', () => {
  // =========================================================================
  // STATIC BOUNDARY TESTS
  // =========================================================================
  describe('Static Boundary', () => {
    test('repository.ts uses server-side supabase only', () => {
      const src = readFile('lib/domain/forwarding/repository.ts');
      expect(src).toContain('@/lib/supabase/admin');
      expect(src).not.toContain('@/lib/supabase/client');
    });

    test('pricing.ts is deleted (replaced by server actions)', () => {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'lib/domain/forwarding/pricing.ts');
      expect(fs.existsSync(filePath)).toBe(false);
    });

    test('AddForwardingItemModal.tsx does NOT import forwarding repository', () => {
      const src = readFile('components/hq/AddForwardingItemModal.tsx');
      expect(src).not.toContain('@/lib/domain/forwarding/repository');
    });

    test('AddForwardingItemModal.tsx does NOT import forwarding pricing', () => {
      const src = readFile('components/hq/AddForwardingItemModal.tsx');
      expect(src).not.toContain('@/lib/domain/forwarding/pricing');
    });

    test('forwardingActions.ts has use server directive', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('use server');
    });

    test('forwardingActions.ts uses server-side createClient', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('@/lib/supabase/server');
    });

    test('forwardingActions.ts does NOT use browser supabase/client', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).not.toContain('@/lib/supabase/client');
    });
  });

  // =========================================================================
  // IDENTITY & AUTHORIZATION TESTS
  // =========================================================================
  describe('Identity & Authorization', () => {
    test('forwardingActions.ts resolves session identity', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('resolveSessionIdentity');
    });

    test('forwardingActions.ts does NOT accept tenant_id from client', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      const hasTenantIdParam = src.match(/export\s+async\s+function\s+\w+\s*\([^)]*tenant_id\s*:\s*string/);
      expect(hasTenantIdParam).toBeNull();
    });

    test('forwardingActions.ts does NOT read x-tenant-id header', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).not.toContain('x-tenant-id');
    });

    test('forwardingActions.ts does NOT read query param tenant_id', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).not.toMatch(/tenant_id\s*=\s*searchParams/);
    });
  });

  // =========================================================================
  // TENANT ISOLATION TESTS
  // =========================================================================
  describe('Tenant Isolation', () => {
    test('md_locations table has RLS enabled', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/ALTER TABLE.*md_locations.*ENABLE ROW LEVEL SECURITY/);
    });

    test('fw_price_master table has RLS enabled', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/ALTER TABLE.*fw_price_master.*ENABLE ROW LEVEL SECURITY/);
    });

    test('md_locations has tenant isolation policy', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/CREATE POLICY.*md_locations.*tenant/);
    });

    test('fw_price_master has tenant isolation policy', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/CREATE POLICY.*fw_price_master.*tenant/);
    });
  });

  // =========================================================================
  // SERVER ACTION BOUNDARY TESTS
  // =========================================================================
  describe('Server Action Boundary', () => {
    test('AddForwardingItemModal.tsx imports from forwardingActions', () => {
      const src = readFile('components/hq/AddForwardingItemModal.tsx');
      expect(src).toContain('@/lib/actions/forwardingActions');
    });

    test('AddForwardingItemModal.tsx uses fetchForwardingLocations', () => {
      const src = readFile('components/hq/AddForwardingItemModal.tsx');
      expect(src).toContain('fetchForwardingLocations');
    });

    test('AddForwardingItemModal.tsx uses calculateForwardingPricing', () => {
      const src = readFile('components/hq/AddForwardingItemModal.tsx');
      expect(src).toContain('calculateForwardingPricing');
    });

    test('forwardingActions.ts exports fetchForwardingLocations', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('export async function fetchForwardingLocations');
    });

    test('forwardingActions.ts exports calculateForwardingPricing', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('export async function calculateForwardingPricing');
    });
  });

  // =========================================================================
  // REGRESSION TESTS
  // =========================================================================
  describe('Regression', () => {
    test('forwardingActions.ts still provides location fetching', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('md_locations');
      expect(src).toContain('location_id');
      expect(src).toContain('name');
    });

    test('forwardingActions.ts still provides pricing calculation', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('fw_price_master');
      expect(src).toContain('sell_price');
      expect(src).toContain('master_cost_origin_amount');
      expect(src).toContain('master_cost_destination_amount');
    });

    test('forwardingActions.ts preserves container type filtering', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('container_type');
    });

    test('forwardingActions.ts preserves port-based costing', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).toContain('origin_port');
      expect(src).toContain('destination_port');
    });
  });

  // =========================================================================
  // ANTI-PATTERN PREVENTION TESTS
  // =========================================================================
  describe('Anti-Pattern Prevention', () => {
    function readForwardingMigrationContents(): string[] {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return [];
      return fs.readdirSync(migDir)
        .filter((f) => f.endsWith('.sql') && f.includes('fw_'))
        .sort()
        .map((f) => readFile(path.join(migDir, f)));
    }

    test('no createBrowserClient in forwarding actions', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).not.toContain('createBrowserClient');
    });

    test('no supabaseAdmin in forwarding actions (uses createClient)', () => {
      const src = readFile('lib/actions/forwardingActions.ts');
      expect(src).not.toContain('supabaseAdmin');
    });

    test('no USING(true) in forwarding migrations', () => {
      const allSql = readForwardingMigrationContents().join('\n');
      expect(allSql).not.toMatch(/USING\s*\(\s*true\s*\)/);
    });

    test('no disabled RLS in forwarding migrations', () => {
      const allSql = readForwardingMigrationContents().join('\n');
      expect(allSql).not.toMatch(/ALTER TABLE.*fw_.*DISABLE ROW LEVEL SECURITY/);
    });
  });

  // =========================================================================
  // PHASE 5A-2 PRESERVATION TESTS
  // =========================================================================
  describe('Phase 5A-2 Preservation', () => {
    test('fw_locations still has tenant_id from Phase 5A-2', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/fw_locations.*tenant_id/);
    });

    test('fw_order_headers still has tenant_id from Phase 5A-2', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/fw_order_headers.*tenant_id/);
    });

    test('fw_legs still has tenant_id from Phase 5A-2', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toMatch(/fw_legs.*tenant_id/);
    });

    test('fw_price_master still has added columns from Phase 5A-2', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toContain('master_cost_origin_amount');
      expect(allSql).toContain('master_cost_destination_amount');
    });
  });
});
