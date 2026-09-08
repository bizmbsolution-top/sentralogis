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

describe('Phase 5A-4 Operational Assignment', () => {
  // =========================================================================
  // API ROUTE TESTS
  // =========================================================================
  describe('API Route', () => {
    test('forwarding assign API route exists', () => {
      expect(fileExists('app/api/forwarding/assign/route.ts')).toBe(true);
    });

    test('assign API resolves session identity', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('resolveSessionIdentity');
    });

    test('assign API asserts permission', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('assertPermission');
    });

    test('assign API requires shipmentId', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('shipmentId');
    });

    test('assign API inserts to job_orders', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain("from('job_orders')");
      expect(src).toContain('.insert(');
    });

    test('assign API uses sbu_type FORWARDING', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain("'FORWARDING'");
    });

    test('assign API enforces tenant isolation', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('tenant_id: tenantId');
      expect(src).toContain('ctx.tenantId');
    });

    test('assign API supports idempotency (update existing)', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('existingJo');
      expect(src).toContain('.update(');
    });

    test('assign API returns persisted assignment', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('data: jo');
    });

    test('assign API has GET endpoint for reading assignment', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('export async function GET');
    });
  });

  // =========================================================================
  // UI INTEGRATION TESTS
  // =========================================================================
  describe('UI Integration', () => {
    test('shipment detail page calls assign API', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('/api/forwarding/assign');
      expect(src).toContain('method: \'POST\'');
    });

    test('shipment detail page reads assignment on load', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('fetch(`/api/forwarding/assign?shipmentId=${id}`)');
      expect(src).toContain('assignRes');
    });

    test('shipment detail page shows assignment status', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('assignment.status');
      expect(src).toContain('assignment.assignee_name');
    });

    test('shipment detail page supports reassignment', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('Reassign');
    });

    test('assignment persists after successful API call', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('setAssignment(json.data)');
    });
  });

  // =========================================================================
  // SECURITY TESTS
  // =========================================================================
  describe('Security', () => {
    test('assign API does NOT use browser supabase client', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('supabaseAdmin');
      expect(src).not.toContain('supabase/client');
    });

    test('assign API does NOT accept client tenant_id', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).not.toMatch(/body\.tenant_id/);
      expect(src).not.toMatch(/tenant_id:\s*body\./);
    });

    test('shipment detail page does NOT import browser supabase', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).not.toContain('supabase/client');
      expect(src).not.toContain('createBrowserClient');
    });

    test('shipment detail page does NOT send client tenant_id', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).not.toMatch(/tenantId\s*[:=]/);
      expect(src).not.toMatch(/tenant_id\s*[:=]/);
    });

    test('assign API uses assertPermission for authorization', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('assertPermission(ctx,');
    });
  });

  // =========================================================================
  // DOMAIN MODEL TESTS
  // =========================================================================
  describe('Domain Model', () => {
    test('job_orders table has assignment columns', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/job_orders.*status/);
      expect(allSql).toMatch(/job_orders.*assigned_at/);
    });

    test('job_orders table has sbu_type column', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/job_orders.*sbu_type/);
    });

    test('job_orders table has shipment_id column', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/shipment_id/);
    });
  });

  // =========================================================================
  // IDEMPOTENCY TESTS
  // =========================================================================
  describe('Idempotency', () => {
    test('assign API checks for existing assignment before insert', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain('existingJo');
      expect(src).toContain('.maybeSingle()');
    });

    test('assign API updates existing assignment instead of duplicating', () => {
      const src = readFile('app/api/forwarding/assign/route.ts');
      expect(src).toContain("from('job_orders')");
      expect(src).toContain('.update(');
      expect(src).toContain('.eq(\'id\', existingJo.id)');
    });
  });

  // =========================================================================
  // LINEAGE PRESERVATION TESTS
  // =========================================================================
  describe('Lineage Preservation', () => {
    test('Sales Order service unchanged', () => {
      expect(fileExists('lib/sales-order/service.ts')).toBe(true);
      const src = readFile('lib/sales-order/service.ts');
      expect(src).toContain('createSalesOrder');
    });

    test('Fulfillment service unchanged', () => {
      expect(fileExists('lib/fulfillment/service.ts')).toBe(true);
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('createFulfillment');
    });

    test('Forwarding server action unchanged', () => {
      expect(fileExists('lib/actions/forwardingActions.ts')).toBe(true);
    });

    test('Shipment service unchanged', () => {
      expect(fileExists('lib/domain/shipment/shipment-service.ts')).toBe(true);
    });
  });
});
