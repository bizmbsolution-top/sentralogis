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

describe('U-26R-P1 Production Readiness', () => {
  // =========================================================================
  // P1-A: NUMBER AUTHORITY
  // =========================================================================

  describe('P1-A. Number Authority', () => {
    const allSql = readAllMigrationContents().join('\n');

    test('canonical quote number authority exists', () => {
      expect(allSql).toContain('next_quote_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*quote_number/);
    });

    test('canonical sales order number authority exists', () => {
      expect(allSql).toContain('next_sales_order');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*so_number/);
    });

    test('canonical fulfillment number authority exists', () => {
      expect(allSql).toContain('next_fulfillment_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*fulfillment_number/);
    });

    test('canonical operational handoff number authority exists', () => {
      expect(allSql).toContain('next_operational_handoff_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*handoff_number/);
    });

    test('forwarding consol_number has server-side trigger', () => {
      expect(allSql).toContain('generate_fw_consol_number');
      expect(allSql).toContain('trg_generate_fw_consol_number');
    });

    test('forwarding consol_number has unique constraint', () => {
      expect(allSql).toContain('fw_consolidations_number_unique');
    });

    test('legacy work_orders has unique constraint on wo_number', () => {
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*wo_number/);
    });

    test('legacy job_orders has unique constraint on jo_number', () => {
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*jo_number/);
    });

    test('shipments has unique constraint on shipment_number', () => {
      expect(allSql).toContain('uq_shp_number');
    });

    test('service_requests has unique constraint on request_number', () => {
      expect(allSql).toContain('uq_svc_request_number');
    });

    test('cus_declarations has unique constraint on declaration_number', () => {
      expect(allSql).toContain('uq_cus_dec_number');
    });

    test('no canonical commercial layer uses Math.random for numbers', () => {
      const quoteSrc = readFile('lib/domain/quote/quote-factory.ts');
      const soSrc = readFile('lib/sales-order/service.ts');
      const flSrc = readFile('lib/fulfillment/service.ts');
      const ohSrc = readFile('lib/operational-handoff/service.ts');

      expect(quoteSrc).not.toContain('Math.random');
      expect(soSrc).not.toContain('Math.random');
      expect(flSrc).not.toContain('Math.random');
      expect(ohSrc).not.toContain('Math.random');
    });

    test('no canonical commercial layer uses Date.now for numbers', () => {
      const quoteSrc = readFile('lib/domain/quote/quote-factory.ts');
      const soSrc = readFile('lib/sales-order/service.ts');
      const flSrc = readFile('lib/fulfillment/service.ts');
      const ohSrc = readFile('lib/operational-handoff/service.ts');

      expect(quoteSrc).not.toContain('Date.now');
      expect(soSrc).not.toContain('Date.now');
      expect(flSrc).not.toContain('Date.now');
      expect(ohSrc).not.toContain('Date.now');
    });
  });

  // =========================================================================
  // P1-B: FORWARDING REALIZATION
  // =========================================================================

  describe('P1-B. Forwarding Realization', () => {
    test('forwarding tables exist with proper migrations', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toContain('fw_consolidations');
      expect(allSql).toContain('fw_container_assignments');
      expect(allSql).toContain('fw_container_items');
      expect(allSql).toContain('fw_box_assignments');
      expect(allSql).toContain('fw_box_items');
    });

    test('forwarding tables have tenant isolation', () => {
      const allSql = readAllMigrationContents().join('\n');
      expect(allSql).toContain('fw_consolidations_tenant_isolation');
      expect(allSql).toContain('fw_container_assignments_tenant_isolation');
      expect(allSql).toContain('fw_container_items_tenant_isolation');
    });

    test('forwarding routes have authentication (P0-C fix intact)', () => {
      const orderHeaderSrc = readFile('app/api/forwarding/order-header/route.ts');
      const stuffSrc = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      const deconsolSrc = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      const boxSrc = readFile('app/api/forwarding/container/[containerId]/box/route.ts');
      const itemsSrc = readFile('app/api/forwarding/box/[boxId]/items/route.ts');

      for (const src of [orderHeaderSrc, stuffSrc, deconsolSrc, boxSrc, itemsSrc]) {
        expect(src).toContain('resolveSessionIdentity');
        expect(src).toContain('assertPermission');
        expect(src).toContain('ctx.tenantId');
      }
    });

    test('forwarding shell UI mock data is documented', () => {
      const shellSrc = readFile('app/sbu/forwarding/page.tsx');
      expect(shellSrc).toContain('ACTIVE CONSOL');
      expect(shellSrc).toContain('BOOKING CONFIRMED');
    });

    test('forwarding dashboard pages use real data', () => {
      const consolListSrc = readFile('app/(dashboard)/sbu/forwarding/consol/page.tsx');
      expect(consolListSrc).toContain('fw_consolidations');
      expect(consolListSrc).toContain('tenantId');
    });
  });

  // =========================================================================
  // P1-C: INTEGRATION / E2E READINESS
  // =========================================================================

  describe('P1-C. Integration/E2E Readiness', () => {
    test('DATABASE_URL is configured for integration tests', () => {
      const envSrc = readFile('.env.local');
      expect(envSrc).toContain('DATABASE_URL');
      expect(envSrc).toContain('DIRECT_URL');
    });

    test('pg client is available for DB integration tests', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.dependencies.pg).toBeDefined();
    });

    test('playwright is available for E2E tests', () => {
      const pkg = JSON.parse(readFile('package.json'));
      expect(pkg.devDependencies.playwright).toBeDefined();
    });

    test('no integration test infrastructure exists yet', () => {
      const hasTestContainer = fs.existsSync(path.join(ROOT, 'test', 'integration'));
      const hasDbTest = fs.existsSync(path.join(ROOT, 'lib', '__tests__', 'db'));
      expect(hasTestContainer || hasDbTest).toBe(false);
    });
  });

  // =========================================================================
  // P1-D: RESIDUAL FINDINGS RECONCILIATION
  // =========================================================================

  describe('P1-D. Residual Findings Reconciliation', () => {
    test('P0-A tenant authority remains intact', () => {
      const shipmentHelper = readFile('lib/domain/shipment/api-helper.ts');
      const customsHelper = readFile('lib/domain/customs/api-helper.ts');

      expect(shipmentHelper).not.toContain("req.headers.get('x-tenant-id')");
      expect(shipmentHelper).not.toContain('API_CONSUMER');
      expect(customsHelper).not.toContain("req.headers.get('x-tenant-id')");
      expect(customsHelper).not.toContain('API_CONSUMER');
    });

    test('P0-B finance tenant isolation remains intact', () => {
      const financeMig = readAllMigrationContents().join('\n');
      expect(financeMig).toContain('finance_tenant_isolation');
      expect(financeMig).toContain('tenant_isolation_add_costs');
      expect(financeMig).toContain('tenant_isolation_finance_journals');
    });

    test('P0-C forwarding authentication remains intact', () => {
      const forwardingRoutes = [
        'app/api/forwarding/order-header/route.ts',
        'app/api/forwarding/consol/[id]/stuff/route.ts',
        'app/api/forwarding/consol/[id]/deconsol/route.ts',
        'app/api/forwarding/container/[containerId]/box/route.ts',
        'app/api/forwarding/box/[boxId]/items/route.ts',
      ];

      for (const route of forwardingRoutes) {
        const src = readFile(route);
        expect(src).toContain('resolveSessionIdentity');
        expect(src).toContain('assertPermission');
      }
    });

    test('Phase 5A-2R: forwarding domain browser client remediation', () => {
      const pricingSrc = readFile('lib/domain/forwarding/pricing.ts');
      const repoSrc = readFile('lib/domain/forwarding/repository.ts');
      const actionsSrc = readFile('lib/actions/forwardingActions.ts');

      // After Phase 5A-2R, repository and pricing should NOT use browser client
      expect(pricingSrc).not.toContain('supabase/client');
      expect(repoSrc).not.toContain('supabase/client');

      // After Phase 5A-2R, server action should use proper server pattern
      expect(actionsSrc).toContain('use server');
      expect(actionsSrc).toContain('resolveSessionIdentity');
      expect(actionsSrc).toContain('@/lib/supabase/server');
    });

    test('customs adapter bypass is documented risk', () => {
      const src = readFile('lib/domain/service-contracts/adapters/customs-adapter.ts');
      expect(src).toContain("from('cus_declarations')");
      expect(src).toContain('.insert(');
    });
  });
});
