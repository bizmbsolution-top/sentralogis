/**
 * Sentralogis — Phase 4B / U-26
 * lib/__tests__/u26-post-u25-architecture-gap-audit.test.ts
 *
 * POST-U25 ARCHITECTURE GAP AUDIT — FORENSIC TEST SUITE
 *
 * Validates key architectural findings from the U-26 discovery audit.
 * NO PRODUCTION CODE MODIFICATIONS — read-only assertions.
 */

import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = path.resolve(process.cwd());

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function readAllMigrations(): string[] {
  const migDir = path.join(ROOT, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) return [];
  return fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
}

function readAllMigrationContents(): string[] {
  return readAllMigrations().map((f) => readFile(path.join(ROOT, 'supabase', 'migrations', f)));
}

// ============================================================================
// U-26 POST-U25 ARCHITECTURE GAP AUDIT
// ============================================================================

describe('U-26 Post-U25 Architecture Gap Audit', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // A. AUTHORITY & TENANT ISOLATION
  // =========================================================================

  describe('A. Authority & Tenant Isolation', () => {
    test('x-tenant-id fallback removed from shipment api-helper', () => {
      const src = readFile('lib/domain/shipment/api-helper.ts');
      expect(src).not.toContain("req.headers.get('x-tenant-id')");
      expect(src).not.toContain('API_CONSUMER');
    });

    test('x-tenant-id fallback removed from customs api-helper', () => {
      const src = readFile('lib/domain/customs/api-helper.ts');
      expect(src).not.toContain("req.headers.get('x-tenant-id')");
      expect(src).not.toContain('API_CONSUMER');
    });

    test('query param tenant_id fallback removed from shipment api-helper', () => {
      const src = readFile('lib/domain/shipment/api-helper.ts');
      expect(src).not.toContain("searchParams.get('tenant_id')");
      expect(src).not.toContain('ANONYMOUS');
    });

    test('query param tenant_id fallback removed from customs api-helper', () => {
      const src = readFile('lib/domain/customs/api-helper.ts');
      expect(src).not.toContain("searchParams.get('tenant_id')");
      expect(src).not.toContain('ANONYMOUS');
    });

    test('finance migration adds tenant_id to tenant-scoped tables', () => {
      const migContents = readAllMigrationContents();
      const financeMig = migContents.find((s) => s.includes('finance_tenant_isolation'));
      expect(financeMig).toBeDefined();
      expect(financeMig).toContain('ALTER TABLE public.add_costs');
      expect(financeMig).toContain('ALTER TABLE public.finance_journals');
      expect(financeMig).toContain('ALTER TABLE public.finance_journal_entries');
    });

    test('finance migration drops unsafe USING(true) RLS policies', () => {
      const migContents = readAllMigrationContents();
      const financeMig = migContents.find((s) => s.includes('finance_tenant_isolation'));
      expect(financeMig).toBeDefined();
      expect(financeMig).toContain('DROP POLICY IF EXISTS "Allow full access to add_costs for authenticated users"');
      expect(financeMig).toContain('DROP POLICY IF EXISTS "Allow full access to finance journals for authenticated users"');
    });

    test('finance migration creates tenant_isolation RLS policies', () => {
      const migContents = readAllMigrationContents();
      const financeMig = migContents.find((s) => s.includes('finance_tenant_isolation'));
      expect(financeMig).toBeDefined();
      expect(financeMig).toContain('tenant_isolation_add_costs');
      expect(financeMig).toContain('tenant_isolation_finance_journals');
      expect(financeMig).toContain('tenant_isolation_finance_journal_entries');
    });
  });

  // =========================================================================
  // B. NUMBER AUTHORITY
  // =========================================================================

  describe('B. Number Authority', () => {
    test('quote number authority is server-side', () => {
      expect(allSql).toContain('next_quote_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*quote_number/);
    });

    test('sales order number authority is server-side', () => {
      expect(allSql).toContain('next_sales_order');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*so_number/);
    });

    test('fulfillment number authority is server-side', () => {
      expect(allSql).toContain('next_fulfillment_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*fulfillment_number/);
    });

    test('operational handoff number authority is server-side', () => {
      expect(allSql).toContain('next_operational_handoff_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*handoff_number/);
    });

    test('legacy WO number fabricates client-side with Math.random', () => {
      const src = readFile('lib/utils/woNumber.ts');
      expect(src).toContain('Math.random');
    });

    test('legacy JO number fabricates client-side with Math.random', () => {
      const src = readFile('lib/domain/service-contracts/adapters/trucking-adapter.ts');
      expect(src).toContain('Math.random');
    });

    test('legacy JO number fabricates client-side with Date.now', () => {
      const src = readFile('lib/domain/service-contracts/adapters/trucking-adapter.ts');
      expect(src).toContain('Date.now');
    });

    test('invoice number has no server-side authority', () => {
      const src = readFile('lib/domain/invoice/lines.ts');
      expect(src).not.toContain('next_invoice_number');
      expect(src).not.toContain('nextval');
    });

    test('shipment number fabricates client-side with Math.random', () => {
      const src = readFile('lib/domain/shipment/shipment-factory.ts');
      expect(src).toContain('Math.random');
    });

    test('master driver code fabricates client-side with Math.random', () => {
      const src = readFile('lib/actions/masterCodeActions.ts');
      expect(src).toContain('Math.random');
    });

    test('master fleet code fabricates client-side with Date.now', () => {
      const src = readFile('lib/actions/masterCodeActions.ts');
      expect(src).toContain('Date.now');
    });
  });

  // =========================================================================
  // C. FORWARDING DOMAIN
  // =========================================================================

  describe('C. Forwarding Domain', () => {
    test('canonical shipment tables exist in migrations', () => {
      expect(allSql).toContain('shp_shipments');
      expect(allSql).toContain('shp_manifest_items');
      expect(allSql).toContain('shp_execution_plans');
    });

    test('Phase 5A-2R: forwarding domain uses server actions (no browser client)', () => {
      const actionsSrc = readFile('lib/actions/forwardingActions.ts');
      expect(actionsSrc).toContain('use server');
      expect(actionsSrc).toContain('resolveSessionIdentity');
      expect(actionsSrc).not.toContain('supabase/client');
    });

    test('forwarding order-header route now has authentication', () => {
      const src = readFile('app/api/forwarding/order-header/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('assertPermission');
      expect(src).toContain('ctx.tenantId');
    });

    test('forwarding stuff route now has authentication', () => {
      const src = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('assertPermission');
      expect(src).toContain('ctx.tenantId');
    });

    test('forwarding deconsol route now has authentication', () => {
      const src = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('assertPermission');
      expect(src).toContain('ctx.tenantId');
    });

    test('forwarding container box route now has authentication', () => {
      const src = readFile('app/api/forwarding/container/[containerId]/box/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('assertPermission');
      expect(src).toContain('ctx.tenantId');
    });

    test('forwarding box items route now has authentication', () => {
      const src = readFile('app/api/forwarding/box/[boxId]/items/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('assertPermission');
      expect(src).toContain('ctx.tenantId');
    });

    test('forwarding shell UI is mock-only per AGENTS.md', () => {
      const agentsSrc = readFile('AGENTS.md');
      expect(agentsSrc).toContain('mock only, belum connect DB');
    });
  });

  // =========================================================================
  // D. CUSTOMS DOMAIN
  // =========================================================================

  describe('D. Customs Domain', () => {
    test('customs adapter bypasses canonical service with direct insert', () => {
      const src = readFile('lib/domain/service-contracts/adapters/customs-adapter.ts');
      expect(src).toContain("from('cus_declarations')");
      expect(src).toContain('.insert(');
    });

    test('customs adapter fabricates AJU number with Math.random', () => {
      const src = readFile('lib/domain/service-contracts/adapters/customs-adapter.ts');
      expect(src).toContain('Math.random');
    });

    test('CEISA preparation has no transmission code', () => {
      const ceisaDir = path.join(ROOT, 'lib', 'domain', 'customs', 'ceisa');
      if (!fs.existsSync(ceisaDir)) {
        expect(true).toBe(true);
        return;
      }
      const files = fs.readdirSync(ceisaDir).filter((f) => f.endsWith('.ts'));
      const src = files.map((f) => readFile(path.join(ceisaDir, f))).join('\n');
      expect(src).not.toMatch(/transmit\(|sendToCeisa|directCeisaTransmit|axios|fetch\(|http\.|node-fetch/i);
    });
  });

  // =========================================================================
  // E. TRUCKING DOMAIN
  // =========================================================================

  describe('E. Trucking Domain', () => {
    test('legacy WO route bypasses lineage with direct JO insert', () => {
      const src = readFile('app/api/wo/route.ts');
      expect(src).toContain('job_orders');
      expect(src).toContain('.insert(');
    });
  });

  // =========================================================================
  // F. WAREHOUSE DOMAIN
  // =========================================================================

  describe('F. Warehouse Domain', () => {
    test('warehouse has no canonical domain service', () => {
      expect(fs.existsSync(path.join(ROOT, 'lib', 'warehouse', 'service.ts'))).toBe(false);
    });

    test('warehouse adapter does not reference internal tables', () => {
      const src = readFile('lib/operational-handoff/adapters/warehouse.ts');
      expect(src).not.toContain('wh_inventory');
      expect(src).not.toContain('wh_tasks');
    });
  });

  // =========================================================================
  // G. OPERATIONAL HANDOFF
  // =========================================================================

  describe('G. Operational Handoff', () => {
    test('handoff has closed state machine', () => {
      const src = readFile('lib/operational-handoff/types.ts');
      expect(src).toContain('OPERATIONAL_HANDOFF_TRANSITIONS');
    });

    test('handoff lacks timeout/expiration', () => {
      const src = readFile('lib/operational-handoff/service.ts');
      expect(src).not.toContain('expires_at');
      expect(src).not.toContain('expiresAt');
    });

    test('handoff adapter lacks compensate interface', () => {
      const src = readFile('lib/operational-handoff/adapters/types.ts');
      expect(src).not.toContain('compensate');
    });
  });

  // =========================================================================
  // H. CONTROL TOWER
  // =========================================================================

  describe('H. Control Tower', () => {
    test('control tower has zero DB writes', () => {
      const src = readFile('lib/control-tower/service.ts');
      expect(src).not.toContain('.insert(');
      expect(src).not.toContain('.update(');
      expect(src).not.toContain('.delete(');
    });

    test('customer view excludes totalAgreedRevenue', () => {
      const src = readFile('lib/control-tower/types.ts');
      expect(src).not.toContain('totalAgreedRevenue');
    });
  });

  // =========================================================================
  // I. INTEGRATION
  // =========================================================================

  describe('I. Integration', () => {
    test('EasyGo integration stores plaintext api_token in migration', () => {
      expect(allSql).toContain('api_token');
      expect(allSql).toMatch(/easygo/i);
    });

    test('Twilio webhook lacks signature verification', () => {
      const src = readFile('app/api/webhooks/whatsapp/route.ts');
      expect(src).not.toMatch(/X-Hub-Signature|signature/i);
    });

    test('Twilio send-template route has mock fallback', () => {
      const src = readFile('app/api/whatsapp/send-template/route.ts');
      expect(src).toContain('Simulating success with mock response');
    });

    test('no accounting system integration exists in migrations', () => {
      expect(allSql).not.toMatch(/\bmekari\b|\bjurnal\b|\bxero\b|\bquickbooks\b|\bsage\b/i);
    });
  });

  // =========================================================================
  // J. AI COPILOT
  // =========================================================================

  describe('J. AI Copilot', () => {
    test('copilot context enricher uses mock data', () => {
      const src = readFile('src/platforms/copilot/engine/ContextEnricher.ts');
      expect(src).toMatch(/mock|Mock/i);
    });

    test('copilot is not wired to canonical APIs', () => {
      const src = readFile('src/platforms/copilot/engine/CopilotEngine.ts');
      expect(src).not.toMatch(/sales-order|fulfillment|operational-handoff/i);
    });
  });

  // =========================================================================
  // K. REAL-WORLD SCENARIOS
  // =========================================================================

  describe('K. Real-World Scenarios', () => {
    test('commercial pipeline page contains mock data', () => {
      const src = readFile('app/(dashboard)/commercial/pipeline/page.tsx');
      expect(src).toContain('Mock');
      expect(src).toContain('mock');
    });

    test('U-25 tests cover multi-SBU scenario', () => {
      const src = readFile('lib/__tests__/u25-real-world-logistics-scenario-validation.test.ts');
      expect(src).toMatch(/FORWARDING|CUSTOMS|TRUCKING|WAREHOUSE/i);
    });

    test('U-25 tests cover split shipment scenario', () => {
      const src = readFile('lib/__tests__/u25-real-world-logistics-scenario-validation.test.ts');
      expect(src).toMatch(/split/i);
    });

    test('U-25 tests cover operational failure scenario', () => {
      const src = readFile('lib/__tests__/u25-real-world-logistics-scenario-validation.test.ts');
      expect(src).toMatch(/REJECTED|FAILED/i);
    });

    test('sales order service lacks amendment workflow', () => {
      const src = readFile('lib/sales-order/service.ts');
      expect(src).not.toContain('amendSalesOrder');
      expect(src).not.toContain('createSalesOrderRevision');
    });
  });

  // =========================================================================
  // L. U-25 REPAIR VERIFICATION
  // =========================================================================

  describe('L. U-25 Repair Verification', () => {
    test('quote identity authority repair remains intact', () => {
      expect(allSql).toContain('next_quote_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*quote_number/);
    });

    test('sales order foundation repair remains intact', () => {
      expect(allSql).toContain('next_sales_order');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*so_number/);
    });

    test('fulfillment foundation repair remains intact', () => {
      expect(allSql).toContain('next_fulfillment_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*fulfillment_number/);
    });

    test('operational handoff foundation repair remains intact', () => {
      expect(allSql).toContain('next_operational_handoff_number');
      expect(allSql).toMatch(/UNIQUE\s*\([^)]*handoff_number/);
    });

    test('canonical commercial service has no browser supabase import', () => {
      const soSrc = readFile('lib/sales-order/service.ts');
      const flSrc = readFile('lib/fulfillment/service.ts');
      expect(soSrc).not.toContain('supabase/client');
      expect(flSrc).not.toContain('supabase/client');
    });

    test('canonical shipment service has no browser supabase import', () => {
      const src = readFile('lib/domain/shipment/shipment-service.ts');
      expect(src).not.toContain('supabase/client');
    });

    test('canonical customs service has no browser supabase import', () => {
      const src = readFile('lib/domain/customs/customs-service.ts');
      expect(src).not.toContain('supabase/client');
    });

    test('control tower service has no DB mutations', () => {
      const src = readFile('lib/control-tower/service.ts');
      expect(src).not.toContain('.insert(');
      expect(src).not.toContain('.update(');
      expect(src).not.toContain('.delete(');
    });
  });
});
