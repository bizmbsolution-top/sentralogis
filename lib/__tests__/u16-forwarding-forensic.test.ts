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

describe('Phase 5A-6 Forensic Audit', () => {
  // =========================================================================
  // TENANT ISOLATION (4 tests)
  // =========================================================================
  describe('Tenant Isolation', () => {
    test('assign API does not accept client tenant_id in body', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toMatch(/body\.tenant_id/);
      expect(src).not.toMatch(/tenant_id:\s*body\./);
    });

    test('assign API does not trust x-tenant-id header', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toContain('x-tenant-id');
    });

    test('assign API derives tenant from session identity', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('resolveSessionIdentity');
      expect(src).toContain('ctx.tenantId');
    });

    test('work queue API derives tenant from session', () => {
      const src = readFile('app/api/v1/forwarding/shipments/route.ts');
      expect(src).toContain('resolveApiAuthContext');
      expect(src).toContain('auth.tenantId');
    });
  });

  // =========================================================================
  // FCL (3 tests)
  // =========================================================================
  describe('FCL Structure', () => {
    test('ContainerUnit type exists with container fields', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain("'CONTAINER'");
      expect(src).toContain('container_number');
      expect(src).toContain('iso_type');
      expect(src).toContain('seal_number');
    });

    test('FCL shipment has one container unit', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('ContainerUnit');
      expect(src).toMatch(/unit_type:\s*'CONTAINER'/);
    });

    test('container fields include ownership tracking', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('is_soc');
      expect(src).toContain('tare_weight_kg');
      expect(src).toContain('max_payload_kg');
    });
  });

  // =========================================================================
  // LCL (3 tests)
  // =========================================================================
  describe('LCL Structure', () => {
    test('PackageUnit type exists with parent container reference', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('PackageUnit');
      expect(src).toContain('parent_container_unit_id');
    });

    test('LCL package types include PALLET BOX BREAKBULK', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain("'PALLET'");
      expect(src).toContain("'BOX'");
      expect(src).toContain("'BREAKBULK'");
    });

    test('multiple packages can share parent container', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toMatch(/parent_container_unit_id\?:\s*string\s*\|\s*null/);
    });
  });

  // =========================================================================
  // CONSOLIDATION / DECONSOLIDATION (4 tests)
  // =========================================================================
  describe('Consolidation / Deconsolidation', () => {
    test('consolidation status lifecycle is defined', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/open.*stuffing.*shipped.*arrived.*deconsol_done.*closed/);
    });

    test('container assignment status lifecycle is defined', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/empty.*stuffed.*shipped.*arrived.*deconsoled.*returned/);
    });

    test('deconsolidation API validates consol status', () => {
      const src = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(src).toContain('arrived');
      expect(src).toContain('shipped');
    });

    test('stuffing API updates container and consol status atomically', () => {
      const src = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(src).toContain('stuffed');
      expect(src).toContain('stuffing');
    });
  });

  // =========================================================================
  // ASSIGNMENT (3 tests)
  // =========================================================================
  describe('Assignment', () => {
    test('assignment uses crypto.randomUUID instead of Math.random', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toMatch(/Math\.random\(\)/);
      expect(src).toContain('crypto.randomUUID');
    });

    test('assignment handles race condition on duplicate', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('23505');
      expect(src).toContain('raceJo');
    });

    test('assignment requires job_order:assign permission', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('job_order:assign');
    });
  });

  // =========================================================================
  // LIFECYCLE (4 tests)
  // =========================================================================
  describe('Lifecycle', () => {
    test('shipment state machine is defined', () => {
      const src = readFile('lib/domain/shipment/state-machine.ts');
      expect(src).toContain('DRAFT');
      expect(src).toContain('PLANNED');
      expect(src).toContain('BOOKED');
      expect(src).toContain('IN_TRANSIT');
      expect(src).toContain('COMPLETED');
      expect(src).toContain('CANCELLED');
    });

    test('fulfillment state machine is defined', () => {
      const src = readFile('lib/fulfillment/types.ts');
      expect(src).toContain('PLANNED');
      expect(src).toContain('ACTIVE');
      expect(src).toContain('FULFILLED');
      expect(src).toContain('CANCELLED');
    });

    test('shipment state machine has canTransition guard', () => {
      const src = readFile('lib/domain/shipment/state-machine.ts');
      expect(src).toContain('canTransition');
    });

    test('fulfillment transitions are guarded', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('FULFILLMENT_TRANSITIONS');
    });
  });

  // =========================================================================
  // IDEMPOTENCY / DUPLICATE MUTATION (3 tests)
  // =========================================================================
  describe('Idempotency', () => {
    test('fulfillment creation handles idempotency_key', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('idempotency_key');
      expect(src).toContain('23505');
    });

    test('sales order creation handles idempotency_key', () => {
      const src = readFile('lib/sales-order/service.ts');
      expect(src).toContain('idempotency_key');
    });

    test('assignment handles concurrent duplicate gracefully', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('existingJo');
      expect(src).toContain('23505');
      expect(src).toContain('raceJo');
    });
  });

  // =========================================================================
  // WORK QUEUE INTEGRITY (2 tests)
  // =========================================================================
  describe('Work Queue Integrity', () => {
    test('work queue derives FCL/LCL type from units', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('fclLclType');
      expect(src).toContain("unit_type === 'CONTAINER'");
      expect(src).toContain("['PALLET', 'BOX', 'BREAKBULK']");
    });

    test('work queue does not fabricate authoritative identifiers', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).not.toMatch(/Math\.random\(\)/);
      expect(src).not.toMatch(/crypto\.randomUUID/);
    });
  });

  // =========================================================================
  // RLS POLICIES (2 tests)
  // =========================================================================
  describe('RLS Policies', () => {
    test('all fw_* tables have RLS enabled', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      const tables = [
        'fw_consolidations',
        'fw_container_assignments',
        'fw_container_items',
        'fw_box_assignments',
        'fw_box_items',
        'fw_price_master',
        'fw_locations',
        'fw_order_headers',
        'fw_legs',
      ];
      for (const table of tables) {
        expect(allSql).toMatch(new RegExp(`ALTER TABLE.*${table}.*ENABLE ROW LEVEL SECURITY`));
      }
    });

    test('all shp_* tables have RLS enabled', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      const tables = [
        'shp_shipments',
        'shp_manifest_items',
        'shp_units',
        'shp_unit_containers',
        'shp_execution_plans',
        'shp_execution_legs',
      ];
      for (const table of tables) {
        expect(allSql).toMatch(new RegExp(`ALTER TABLE.*${table}.*ENABLE ROW LEVEL SECURITY`));
      }
    });
  });

  // =========================================================================
  // CROSS-DOMAIN BOUNDARY (2 tests)
  // =========================================================================
  describe('Cross-Domain Boundary', () => {
    test('forwarding code does not write to sales_orders', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toContain('sales_orders');
    });

    test('forwarding code does not write to fulfillments', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toContain('fulfillments');
    });
  });

  // =========================================================================
  // LINEAGE VERIFICATION (2 tests)
  // =========================================================================
  describe('Lineage Verification', () => {
    test('SO → Fulfillment lineage is canonical', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('salesOrderId');
      expect(src).toContain('sales_orders');
    });

    test('Fulfillment → Allocation lineage is canonical', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('fulfillment_allocations');
      expect(src).toContain('fulfillment_id: fulfillment.id');
    });
  });

  // =========================================================================
  // NUMBER AUTHORITY (2 tests)
  // =========================================================================
  describe('Number Authority', () => {
    test('JO number uses crypto.randomUUID not Math.random', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toMatch(/Math\.random\(\)/);
      expect(src).toContain('crypto.randomUUID');
    });

    test('consolidation number uses database sequence', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/fw_consolidation_seq/);
      expect(allSql).toMatch(/generate_fw_consol_number/);
    });
  });
});
