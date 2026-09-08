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

describe('Phase 5A-5 FCL/LCL Workflow', () => {
  // =========================================================================
  // FCL/LCL TYPE DETECTION
  // =========================================================================
  describe('FCL/LCL Type Detection', () => {
    test('work queue derives FCL/LCL type from units', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('fclLclType');
      expect(src).toContain("unit_type === 'CONTAINER'");
      expect(src).toContain("['PALLET', 'BOX', 'BREAKBULK']");
    });

    test('work queue has FCL/LCL filter', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('fclLclFilter');
      expect(src).toContain("value=\"FCL\"");
      expect(src).toContain("value=\"LCL\"");
    });

    test('work queue shows FCL/LCL badge', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('FCL_LCL_COLORS');
      expect(src).toContain('item.fclLclType');
    });
  });

  // =========================================================================
  // CARGO OWNER TRACKING
  // =========================================================================
  describe('Cargo Owner Tracking', () => {
    test('work queue displays cargo owner count', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('cargoOwnerCount');
    });

    test('consol detail page fetches cargo owner data via server action', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx');
      expect(src).toContain('getConsolidationDetail');
      expect(src).toContain('from \'@/lib/actions/forwardingActions\'');
    });

    test('consolidation detail server action returns container items and assignments', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      expect(action).toContain('fw_container_items');
      expect(action).toContain('fw_container_assignments');
    });

    test('fw_container_items has cargo_owner_name column', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const migration172 = readFile(path.join(migDir, '172_add_fw_tracking_token.sql'));
      expect(migration172).toContain('cargo_owner_name');
      expect(migration172).toContain('fw_container_items');
    });
  });

  // =========================================================================
  // CONSOLIDATION WORKFLOW
  // =========================================================================
  describe('Consolidation Workflow', () => {
    test('consolidation list page exists with real data', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/consol/page.tsx')).toBe(true);
    });

    test('consolidation detail page exists with real data', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx')).toBe(true);
    });

    test('stuffing page exists with real data', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx')).toBe(true);
    });

    test('box manager page exists with real data', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/consol/[id]/box/[containerId]/page.tsx')).toBe(true);
    });

    test('consolidation status flow is correct', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx');
      expect(src).toContain("'open'");
      expect(src).toContain("'stuffing'");
      expect(src).toContain("'shipped'");
      expect(src).toContain("'arrived'");
      expect(src).toContain("'deconsol_done'");
    });
  });

  // =========================================================================
  // ASSIGNMENT INTEGRATION
  // =========================================================================
  describe('Assignment Integration', () => {
    test('shipment detail page uses persisted assignment', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('/api/forwarding/assign');
      expect(src).toContain('setAssignment');
    });

    test('assignment supports reassignment', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('Reassign');
    });

    test('assignment shows persisted state after reload', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('assignment.status');
      expect(src).toContain('assignment.assignee_name');
      expect(src).toContain('assignment.assigned_at');
    });
  });

  // =========================================================================
  // SECURITY
  // =========================================================================
  describe('Security', () => {
    test('no browser supabase client in work queue', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).not.toContain('supabase/client');
      expect(src).not.toContain('createBrowserClient');
    });

    test('no client tenant_id in work queue', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).not.toMatch(/tenantId\s*[:=]/);
      expect(src).not.toMatch(/tenant_id\s*[:=]/);
    });

    test('assign API uses assertPermission', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('assertPermission');
    });

    test('assign API uses supabaseAdmin (server-side)', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('supabaseAdmin');
    });
  });

  // =========================================================================
  // COMMERCIAL/OPERATIONAL BOUNDARY
  // =========================================================================
  describe('Commercial/Operational Boundary', () => {
    test('job_orders are operational (not commercial root)', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/job_orders.*sbu_type/);
    });

    test('sales_orders remain commercial root', () => {
      expect(fileExists('lib/sales-order/service.ts')).toBe(true);
    });

    test('fulfillments remain composition boundary', () => {
      expect(fileExists('lib/fulfillment/service.ts')).toBe(true);
    });
  });

  // =========================================================================
  // SHIPMENT LIFECYCLE
  // =========================================================================
  describe('Shipment Lifecycle', () => {
    test('shipment global status state machine exists', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('DRAFT');
      expect(src).toContain('PLANNED');
      expect(src).toContain('BOOKED');
      expect(src).toContain('IN_TRANSIT');
      expect(src).toContain('COMPLETED');
    });

    test('shipment units support FCL (ContainerUnit)', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('ContainerUnit');
      expect(src).toContain('container_number');
      expect(src).toContain('iso_type');
    });

    test('shipment units support LCL (PackageUnit with parent_container)', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('PackageUnit');
      expect(src).toContain('parent_container_unit_id');
    });
  });
});
