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

describe('Phase 5A-3R-P1 Fulfillment Allocation Contract Repair', () => {
  // =========================================================================
  // CONTRACT TESTS: UI Transformation
  // =========================================================================
  describe('UI Transformation', () => {
    test('fulfillment page transforms capabilities to allocations', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toContain('allocations');
      expect(src).toContain('capabilityType');
      expect(src).toContain('allocatedQuantity');
    });

    test('fulfillment page does NOT send capabilities to API', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).not.toMatch(/capabilities:\s*selectedCapabilities/);
      expect(src).not.toMatch(/capabilities:\s*\[/);
    });

    test('fulfillment page sends allocations array to API', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toMatch(/allocations/);
      expect(src).toMatch(/salesOrderId/);
      expect(src).toMatch(/targetFulfillmentDate/);
    });

    test('allocations are mapped from selectedCapabilities', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toContain('selectedCapabilities.map');
    });

    test('each allocation has capabilityType and allocatedQuantity', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toContain('capabilityType');
      expect(src).toContain('allocatedQuantity: 1');
    });
  });

  // =========================================================================
  // CONTRACT TESTS: API Route
  // =========================================================================
  describe('API Route Contract', () => {
    test('fulfillment API reads allocations from body', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).toContain('body.allocations');
    });

    test('fulfillment API does NOT read capabilities from body', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).not.toContain('body.capabilities');
    });

    test('fulfillment API uses canonical CreateFulfillmentInput type', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).toContain('CreateFulfillmentInput');
    });

    test('fulfillment API resolves session identity', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).toContain('resolveSessionIdentity');
    });
  });

  // =========================================================================
  // CONTRACT TESTS: Domain Service
  // =========================================================================
  describe('Domain Service Contract', () => {
    test('fulfillment service creates allocations when provided', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain("input.allocations && input.allocations.length > 0");
      expect(src).toContain("from('fulfillment_allocations')");
      expect(src).toContain('.insert(allocationPayloads');
    });

    test('allocation payload includes tenant_id from context', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('tenant_id: tenantId');
    });

    test('allocation payload includes fulfillment_id relationship', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('fulfillment_id: fulfillment.id');
    });

    test('allocation payload includes capability_type', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('capability_type: a.capabilityType');
    });

    test('allocation payload includes allocated_quantity', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('allocated_quantity: a.allocatedQuantity');
    });

    test('allocation rollback on failure', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain("from('fulfillments').delete().eq('id', fulfillment.id)");
    });
  });

  // =========================================================================
  // CONTRACT TESTS: Type Definitions
  // =========================================================================
  describe('Type Definitions', () => {
    test('CreateFulfillmentAllocationInput type exists', () => {
      const src = readFile('lib/fulfillment/types.ts');
      expect(src).toContain('export interface CreateFulfillmentAllocationInput');
    });

    test('CreateFulfillmentAllocationInput has capabilityType', () => {
      const src = readFile('lib/fulfillment/types.ts');
      expect(src).toMatch(/CreateFulfillmentAllocationInput[\s\S]*?capabilityType/);
    });

    test('CreateFulfillmentAllocationInput has allocatedQuantity', () => {
      const src = readFile('lib/fulfillment/types.ts');
      expect(src).toMatch(/CreateFulfillmentAllocationInput[\s\S]*?allocatedQuantity/);
    });

    test('CreateFulfillmentInput has allocations field', () => {
      const src = readFile('lib/fulfillment/types.ts');
      expect(src).toMatch(/CreateFulfillmentInput[\s\S]*\sallocations\?:\sCreateFulfillmentAllocationInput\[\]/);
    });
  });

  // =========================================================================
  // SECURITY TESTS
  // =========================================================================
  describe('Security', () => {
    test('fulfillment page does NOT import browser supabase client', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).not.toContain('supabase/client');
      expect(src).not.toContain('createBrowserClient');
    });

    test('fulfillment page does NOT use supabaseAdmin', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).not.toContain('supabaseAdmin');
    });

    test('fulfillment page does NOT send client tenant_id', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).not.toMatch(/tenantId\s*[:=]/);
      expect(src).not.toMatch(/tenant_id\s*[:=]/);
    });

    test('fulfillment API resolves identity from session', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).toContain('resolveSessionIdentity');
    });

    test('fulfillment service uses IdentityContext tenant', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('context.tenantId');
    });
  });

  // =========================================================================
  // LINEAGE TESTS
  // =========================================================================
  describe('Lineage', () => {
    test('fulfillment allocations link to fulfillment', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('fulfillment_id: fulfillment.id');
    });

    test('fulfillment links to sales order', () => {
      const src = readFile('lib/fulfillment/service.ts');
      expect(src).toContain('salesOrderId');
    });

    test('forwarding adapter exists for operational handoff', () => {
      expect(fileExists('lib/operational-handoff/adapters/forwarding.ts')).toBe(true);
    });

    test('forwarding handoff adapter creates shipment reference', () => {
      const src = readFile('lib/operational-handoff/adapters/forwarding.ts');
      expect(src).toContain('SHIPMENT');
    });
  });

  // =========================================================================
  // PERSISTENCE CONTRACT TESTS
  // =========================================================================
  describe('Persistence Contract', () => {
    test('fulfillment_allocations table has RLS enabled', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/fulfillment_allocations.*ENABLE ROW LEVEL SECURITY/);
    });

    test('fulfillment_allocations has tenant isolation policy', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/fulfillment_allocations.*tenant_id/);
    });

    test('fulfillment_allocations has fulfillment_id FK', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/fulfillment_allocations.*fulfillment_id/);
    });

    test('fulfillment_allocations has capability_type', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      if (!fs.existsSync(migDir)) return;
      const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
      const allSql = files.map((f) => readFile(path.join(migDir, f))).join('\n');
      expect(allSql).toMatch(/fulfillment_allocations.*capability_type/);
    });
  });

  // =========================================================================
  // NO OBSOLETE CONTRACT TESTS
  // =========================================================================
  describe('No Obsolete Contract', () => {
    test('no other fulfillment creation callers send capabilities', () => {
      const files = [
        'app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx',
      ];
      for (const file of files) {
        const src = readFile(file);
        expect(src).not.toMatch(/capabilities:\s*selectedCapabilities/);
      }
    });

    test('fulfillment API does not accept capabilities field', () => {
      const src = readFile('app/api/v1/commercial/fulfillments/route.ts');
      expect(src).not.toContain('body.capabilities');
    });
  });
});
