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

describe('Phase 5A-2 Forwarding Schema Repair', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // Schema Repairs
  // =========================================================================

  describe('fw_locations repair', () => {
    test('tenant_id column exists on fw_locations', () => {
      expect(allSql).toContain('ALTER TABLE IF EXISTS public.fw_locations');
      expect(allSql).toContain('ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL');
    });

    test('fw_locations has RLS policy', () => {
      expect(allSql).toContain('fw_locations_tenant_isolation');
    });

    test('fw_locations RLS uses get_my_tenant_id', () => {
      const phase5a2Migration = readFile('supabase/migrations/20260831_024_phase5a2_forwarding_schema_repair.sql');
      const rlsMatch = phase5a2Migration.match(/fw_locations_tenant_isolation[\s\S]*?WITH CHECK/)?.[0] || '';
      expect(rlsMatch).toContain('get_my_tenant_id()');
    });

    test('fw_locations has tenant index', () => {
      expect(allSql).toContain('idx_fw_locations_tenant');
    });
  });

  describe('fw_order_headers repair', () => {
    test('fw_order_headers table exists with tenant_id', () => {
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS public.fw_order_headers');
      expect(allSql).toContain('tenant_id UUID NOT NULL');
    });

    test('fw_order_headers uses TEXT status instead of broken enum', () => {
      expect(allSql).toContain('status TEXT NOT NULL DEFAULT \'pending\'');
      expect(allSql).toContain('CHECK (status IN (\'pending\'');
    });

    test('fw_order_headers has RLS policy', () => {
      expect(allSql).toContain('fw_order_headers_tenant_isolation');
    });

    test('fw_order_headers has required indexes', () => {
      expect(allSql).toContain('idx_fw_order_headers_tenant');
      expect(allSql).toContain('idx_fw_order_headers_wo_id');
    });
  });

  describe('fw_legs repair', () => {
    test('fw_legs table exists with tenant_id', () => {
      expect(allSql).toContain('CREATE TABLE IF NOT EXISTS public.fw_legs');
      expect(allSql).toContain('tenant_id UUID NOT NULL');
    });

    test('fw_legs uses TEXT enums instead of broken enums', () => {
      expect(allSql).toContain('leg_type TEXT NOT NULL DEFAULT \'SEA\'');
      expect(allSql).toContain('CHECK (leg_type IN (\'SEA\'');
      expect(allSql).toContain('execution_mode TEXT NOT NULL DEFAULT \'OWN\'');
      expect(allSql).toContain('CHECK (execution_mode IN (\'OWN\'');
      expect(allSql).toContain('status TEXT NOT NULL DEFAULT \'planned\'');
      expect(allSql).toContain('CHECK (status IN (\'planned\'');
    });

    test('fw_legs has corrected schema in Phase 5A-2 migration (TEXT enums)', () => {
      const phase5a2Migration = readFile('supabase/migrations/20260831_024_phase5a2_forwarding_schema_repair.sql');
      expect(phase5a2Migration).toContain('CREATE TABLE IF NOT EXISTS public.fw_legs');
      expect(phase5a2Migration).toContain('leg_type TEXT NOT NULL DEFAULT \'SEA\'');
      expect(phase5a2Migration).toContain('execution_mode TEXT NOT NULL DEFAULT \'OWN\'');
      expect(phase5a2Migration).toContain('status TEXT NOT NULL DEFAULT \'planned\'');
      expect(phase5a2Migration).not.toContain('NOT feed=');
    });

    test('fw_legs has RLS policy', () => {
      expect(allSql).toContain('fw_legs_tenant_isolation');
    });

    test('fw_legs has required indexes', () => {
      expect(allSql).toContain('idx_fw_legs_tenant');
      expect(allSql).toContain('idx_fw_legs_order');
    });
  });

  describe('fw_price_master alignment', () => {
    test('fw_price_master has master_cost_origin_amount', () => {
      expect(allSql).toContain('master_cost_origin_amount');
    });

    test('fw_price_master has master_cost_destination_amount', () => {
      expect(allSql).toContain('master_cost_destination_amount');
    });

    test('fw_price_master has sub_type as TEXT', () => {
      expect(allSql).toContain('sub_type TEXT NOT NULL DEFAULT \'standard\'');
    });
  });

  describe('consol_number canonical authority', () => {
    test('next_consol_number() function exists with canonical pattern', () => {
      expect(allSql).toContain('CREATE OR REPLACE FUNCTION public.next_consol_number(p_tenant_id UUID)');
      expect(allSql).toContain('SECURITY DEFINER');
      expect(allSql).toContain("SET search_path = public");
      expect(allSql).toContain('nextval(\'public.fw_consolidation_seq\')');
      expect(allSql).toContain('FWD-');
      expect(allSql).toContain('lpad(v_seq::text, 3, \'0\')');
    });

    test('next_consol_number() has sequence grants', () => {
      expect(allSql).toContain('GRANT EXECUTE ON FUNCTION public.next_consol_number(UUID) TO authenticated');
      expect(allSql).toContain('GRANT USAGE, SELECT ON SEQUENCE public.fw_consolidation_seq TO authenticated');
    });

    test('trigger calls next_consol_number()', () => {
      expect(allSql).toContain('NEW.consol_number := public.next_consol_number(NEW.tenant_id)');
    });

    test('trigger function has SECURITY DEFINER', () => {
      const triggerFn = allSql.match(/CREATE OR REPLACE FUNCTION public\.generate_fw_consol_number\(\)[\s\S]*?LANGUAGE plpgsql[\s\S]*?;/)?.[0] || '';
      expect(triggerFn).toContain('SECURITY DEFINER');
      expect(triggerFn).toContain("SET search_path = public");
    });

    test('consol_number has canonical COMMENT', () => {
      expect(allSql).toContain('Client MUST NOT generate canonical consol numbers');
    });
  });

  describe('forwarding wo_number canonical authority', () => {
    test('next_forwarding_wo_number() function exists with canonical pattern', () => {
      expect(allSql).toContain('CREATE OR REPLACE FUNCTION public.next_forwarding_wo_number(');
      expect(allSql).toContain('SECURITY DEFINER');
      expect(allSql).toContain("SET search_path = public");
      expect(allSql).toContain('nextval(\'public.seq_forwarding_wo\')');
      expect(allSql).toContain('FWD-');
      expect(allSql).toContain('lpad(v_seq::text, 3, \'0\')');
    });

    test('next_forwarding_wo_number() has sequence grants', () => {
      expect(allSql).toContain('GRANT EXECUTE ON FUNCTION public.next_forwarding_wo_number(UUID, TEXT, TEXT) TO authenticated');
      expect(allSql).toContain('GRANT USAGE, SELECT ON SEQUENCE public.seq_forwarding_wo TO authenticated');
    });

    test('seq_forwarding_wo sequence exists', () => {
      expect(allSql).toContain('CREATE SEQUENCE IF NOT EXISTS public.seq_forwarding_wo START 1 INCREMENT BY 1');
    });

    test('forwarding writer no longer uses Math.random for wo_number', () => {
      const writerSrc = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const woNumberSection = writerSrc.match(/\/\/ ---- Legacy operational case file[\s\S]*?const wo_number =/)?.[0] || '';
      expect(woNumberSection).not.toContain('Math.random');
      expect(woNumberSection).not.toContain('countLegacyWorkOrders');
    });

    test('forwarding writer no longer uses countLegacyWorkOrders for wo_number', () => {
      const writerSrc = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const woNumberSection = writerSrc.match(/\/\/ ---- Legacy operational case file[\s\S]*?const wo_number =/)?.[0] || '';
      expect(woNumberSection).not.toContain('countLegacyWorkOrders');
    });

    test('forwarding writer calls next_forwarding_wo_number or _woNumberRpc', () => {
      const writerSrc = readFile('lib/application/service-contracts/forwarding-writer.ts');
      expect(writerSrc).toContain('next_forwarding_wo_number');
      expect(writerSrc).toContain('_woNumberRpc');
    });

    test('forwarding wo_number has canonical COMMENT', () => {
      expect(allSql).toContain('Client MUST NOT generate canonical forwarding WO numbers');
    });
  });

  // =========================================================================
  // Code Fixes
  // =========================================================================

  describe('pricing code fix (now in forwardingActions.ts)', () => {
    const pricingSrc = readFile('lib/actions/forwardingActions.ts');

    test('no longer queries non-existent price_amount column', () => {
      expect(pricingSrc).not.toContain('price_amount');
    });

    test('queries sell_price instead of price_amount', () => {
      expect(pricingSrc).toContain('sell_price');
    });

    test('no longer queries non-existent origin_location_id', () => {
      expect(pricingSrc).not.toContain('origin_location_id');
    });

    test('no longer queries non-existent destination_location_id', () => {
      expect(pricingSrc).not.toContain('destination_location_id');
    });

    test('queries origin_port instead', () => {
      expect(pricingSrc).toContain('origin_port');
    });

    test('queries destination_port instead', () => {
      expect(pricingSrc).toContain('destination_port');
    });

    test('queries destination_port instead (eq chain)', () => {
      expect(pricingSrc).toContain('.eq(\'destination_port\'');
    });

    test('fetchMasterCosting accepts port names', () => {
      expect(pricingSrc).toMatch(/fetchMasterCosting\(\s*originPort:\s*string/);
    });
  });

  describe('AddForwardingItemModal code fix', () => {
    const modalSrc = readFile('components/hq/AddForwardingItemModal.tsx');

    test('passes location name instead of location_id to pricing', () => {
      expect(modalSrc).toContain('startLoc.name');
      expect(modalSrc).toContain('endLoc.name');
      expect(modalSrc).not.toMatch(/startLoc\.location_id/);
      expect(modalSrc).not.toMatch(/endLoc\.location_id/);
    });
  });

  // =========================================================================
  // Architecture Invariants
  // =========================================================================

  describe('Forwarding architecture invariants', () => {
    test('no competing commercial root in forwarding tables', () => {
      expect(allSql).not.toContain('CREATE TABLE forwarding_');
      expect(allSql).not.toContain('CREATE TABLE fw_sales_orders');
      expect(allSql).not.toContain('CREATE TABLE fw_fulfillments');
    });

    test('forwarding tables reference canonical work_orders', () => {
      expect(allSql).toContain('REFERENCES work_orders(wo_id)');
    });

    test('forwarding tables reference canonical customers', () => {
      expect(allSql).toContain('REFERENCES customers(customer_id)');
    });

    test('no USING (true) in forwarding RLS policies', () => {
      const forwardingRlsSection = allSql.match(/fw_locations_tenant_isolation[\s\S]*?WITH CHECK/)?.[0] || '';
      const orderHeaderRlsSection = allSql.match(/fw_order_headers_tenant_isolation[\s\S]*?WITH CHECK/)?.[0] || '';
      const legsRlsSection = allSql.match(/fw_legs_tenant_isolation[\s\S]*?WITH CHECK/)?.[0] || '';

      expect(forwardingRlsSection).not.toContain('USING (true)');
      expect(orderHeaderRlsSection).not.toContain('USING (true)');
      expect(legsRlsSection).not.toContain('USING (true)');
    });
  });

  // =========================================================================
  // P0 Security Regression
  // =========================================================================

  describe('P0 security regression', () => {
    test('P0-A tenant authority intact in forwarding routes', () => {
      const orderHeaderRoute = readFile('app/api/forwarding/order-header/route.ts');
      expect(orderHeaderRoute).toContain('resolveSessionIdentity');
      expect(orderHeaderRoute).toContain('assertPermission');
      expect(orderHeaderRoute).toContain('ctx.tenantId');
    });

    test('no x-tenant-id fallback in forwarding api-helpers', () => {
      const shipmentHelper = readFile('lib/domain/shipment/api-helper.ts');
      const customsHelper = readFile('lib/domain/customs/api-helper.ts');
      expect(shipmentHelper).not.toContain("req.headers.get('x-tenant-id')");
      expect(customsHelper).not.toContain("req.headers.get('x-tenant-id')");
    });
  });
});
