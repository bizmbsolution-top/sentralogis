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

describe('Phase 5A-3 Forwarding Vertical Slice', () => {
  // =========================================================================
  // COMMERCIAL ORDER UI TESTS
  // =========================================================================
  describe('Commercial Order UI', () => {
    test('Sales Order list page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/sales-orders/page.tsx')).toBe(true);
    });

    test('Sales Order detail page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/sales-orders/[id]/page.tsx')).toBe(true);
    });

    test('Sales Order create page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/sales-orders/create/page.tsx')).toBe(true);
    });

    test('Sales Order list page has search and filter', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/page.tsx');
      expect(src).toContain('Search');
      expect(src).toContain('statusFilter');
    });

    test('Sales Order create page uses canonical API', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/create/page.tsx');
      expect(src).toContain('/api/v1/commercial/sales-orders');
    });

    test('Sales Order create page does NOT accept client tenant_id', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/create/page.tsx');
      expect(src).not.toContain('tenantId');
      expect(src).not.toContain('tenant_id');
    });
  });

  // =========================================================================
  // FULFILLMENT ENTRY POINT TESTS
  // =========================================================================
  describe('Fulfillment Entry Point', () => {
    test('Fulfillment create page exists', () => {
      expect(fileExists('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx')).toBe(true);
    });

    test('Fulfillment create page uses canonical API', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toContain('/api/v1/commercial/fulfillments');
    });

    test('Fulfillment create page supports capability selection', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).toContain('FORWARDING');
      expect(src).toContain('CUSTOMS');
      expect(src).toContain('TRUCKING');
      expect(src).toContain('WAREHOUSE');
    });

    test('Fulfillment create page does NOT accept client tenant_id', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx');
      expect(src).not.toContain('tenantId');
      expect(src).not.toContain('tenant_id');
    });
  });

  // =========================================================================
  // FORWARDING SBU WORK QUEUE TESTS
  // =========================================================================
  describe('Forwarding SBU Work Queue', () => {
    test('Forwarding work queue page exists', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/work-queue/page.tsx')).toBe(true);
    });

    test('Forwarding work queue uses canonical shipment API', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('/api/v1/forwarding/shipments');
    });

    test('Forwarding work queue has search and filter', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('Search');
      expect(src).toContain('statusFilter');
    });

    test('Forwarding work queue does NOT use browser supabase client', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).not.toContain('supabase/client');
      expect(src).not.toContain('supabaseAdmin');
    });
  });

  // =========================================================================
  // FORWARDING SHIPMENT DETAIL TESTS
  // =========================================================================
  describe('Forwarding Shipment Detail', () => {
    test('Forwarding shipment detail page exists', () => {
      expect(fileExists('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx')).toBe(true);
    });

    test('Forwarding shipment detail uses canonical API', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('/api/v1/forwarding/shipments');
    });

    test('Forwarding shipment detail has assignment capability', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).toContain('Assign');
      expect(src).toContain('assignModalOpen');
    });

    test('Forwarding shipment detail does NOT use browser supabase client', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx');
      expect(src).not.toContain('supabase/client');
      expect(src).not.toContain('supabaseAdmin');
    });
  });

  // =========================================================================
  // SECURITY TESTS
  // =========================================================================
  describe('Security', () => {
    test('no new browser supabase client imports in vertical slice pages', () => {
      const pages = [
        'app/(dashboard)/commercial/sales-orders/page.tsx',
        'app/(dashboard)/commercial/sales-orders/[id]/page.tsx',
        'app/(dashboard)/commercial/sales-orders/create/page.tsx',
        'app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx',
        'app/(dashboard)/sbu/forwarding/work-queue/page.tsx',
        'app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx',
      ];

      for (const page of pages) {
        const src = readFile(page);
        expect(src).not.toContain('supabase/client');
        expect(src).not.toContain('createBrowserClient');
      }
    });

    test('no client tenant_id in vertical slice pages', () => {
      const pages = [
        'app/(dashboard)/commercial/sales-orders/create/page.tsx',
        'app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx',
      ];

      for (const page of pages) {
        const src = readFile(page);
        expect(src).not.toMatch(/tenantId\s*[:=]/);
        expect(src).not.toMatch(/tenant_id\s*[:=]/);
      }
    });

    test('no supabaseAdmin in vertical slice pages', () => {
      const pages = [
        'app/(dashboard)/commercial/sales-orders/page.tsx',
        'app/(dashboard)/commercial/sales-orders/[id]/page.tsx',
        'app/(dashboard)/commercial/sales-orders/create/page.tsx',
        'app/(dashboard)/commercial/sales-orders/[id]/fulfillment/page.tsx',
        'app/(dashboard)/sbu/forwarding/work-queue/page.tsx',
        'app/(dashboard)/sbu/forwarding/shipments/[id]/page.tsx',
      ];

      for (const page of pages) {
        const src = readFile(page);
        expect(src).not.toContain('supabaseAdmin');
      }
    });
  });

  // =========================================================================
  // ARCHITECTURE PRESERVATION TESTS
  // =========================================================================
  describe('Architecture Preservation', () => {
    test('Sales Order domain service still exists', () => {
      expect(fileExists('lib/sales-order/service.ts')).toBe(true);
    });

    test('Fulfillment domain service still exists', () => {
      expect(fileExists('lib/fulfillment/service.ts')).toBe(true);
    });

    test('Shipment domain service still exists', () => {
      expect(fileExists('lib/domain/shipment/shipment-service.ts')).toBe(true);
    });

    test('Operational Handoff service still exists', () => {
      expect(fileExists('lib/operational-handoff/service.ts')).toBe(true);
    });

    test('Forwarding server action still exists', () => {
      expect(fileExists('lib/actions/forwardingActions.ts')).toBe(true);
    });

    test('Canonical lineage preserved: Engagement → Sales Order → Fulfillment', () => {
      const soSrc = readFile('lib/sales-order/service.ts');
      const flSrc = readFile('lib/fulfillment/service.ts');
      expect(soSrc).toContain('engagement');
      expect(flSrc).toContain('salesOrderId');
    });
  });

  // =========================================================================
  // UI/UX TESTS
  // =========================================================================
  describe('UI/UX', () => {
    test('Sales Order list has empty state', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/page.tsx');
      expect(src).toContain('No sales orders found');
    });

    test('Sales Order list has loading state', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/page.tsx');
      expect(src).toContain('Loading');
    });

    test('Sales Order list has error state', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/page.tsx');
      expect(src).toContain('AlertCircle');
    });

    test('Forwarding work queue has empty state', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('No forwarding work items');
    });

    test('Forwarding work queue has loading state', () => {
      const src = readFile('app/(dashboard)/sbu/forwarding/work-queue/page.tsx');
      expect(src).toContain('Loading');
    });

    test('Sales Order detail shows fulfillment status', () => {
      const src = readFile('app/(dashboard)/commercial/sales-orders/[id]/page.tsx');
      expect(src).toContain('Fulfillments');
      expect(src).toContain('fulfillmentNumber');
    });
  });
});
