import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('SBU Forwarding Wave 2 — WO Create/List/Detail Integration', () => {
  // =========================================================================
  // A. WO CREATE INTEGRATION
  // =========================================================================
  describe('WO Create page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/wo/create/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for master prices', () => {
      expect(pageSrc).toContain('fetchForwardingMasterPrices');
    });

    test('page.tsx imports from canonical forwarding actions', () => {
      expect(pageSrc).toContain('forwardingActions');
    });

    test('page.tsx has no direct fw_price_master query', () => {
      expect(pageSrc).not.toContain('fw_price_master');
    });

    test('page.tsx preserves customer selection UX', () => {
      expect(pageSrc).toContain('customer_id');
    });

    test('page.tsx preserves service type selection UX', () => {
      expect(pageSrc).toContain('service_type');
    });

    test('page.tsx preserves delivery type selection UX', () => {
      expect(pageSrc).toContain('delivery_type');
    });

    test('page.tsx preserves container details UX', () => {
      expect(pageSrc).toContain('containers');
    });

    test('page.tsx posts to canonical forwarding WO endpoint', () => {
      expect(pageSrc).toContain('/api/forwarding/wo');
    });
  });

  // =========================================================================
  // B. WO LIST INTEGRATION
  // =========================================================================
  describe('WO List page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/wo/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('fetchForwardingWorkOrders');
    });

    test('page.tsx imports from canonical forwarding actions', () => {
      expect(pageSrc).toContain('forwardingActions');
    });

    test('page.tsx has no direct supabase query calls', () => {
      expect(pageSrc).not.toContain('.from(');
      expect(pageSrc).not.toContain('.select(');
      expect(pageSrc).not.toContain('.eq(');
    });
  });

  // =========================================================================
  // C. WO DETAIL INTEGRATION
  // =========================================================================
  describe('WO Detail page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/wo/[id]/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('getForwardingWorkOrderDetail');
    });

    test('page.tsx imports from canonical forwarding actions', () => {
      expect(pageSrc).toContain('forwardingActions');
    });

    test('page.tsx has no direct supabase query calls', () => {
      expect(pageSrc).not.toContain('.from(');
      expect(pageSrc).not.toContain('.select(');
      expect(pageSrc).not.toContain('.eq(');
    });

    test('page.tsx displays forwarding execution details', () => {
      expect(pageSrc).toContain('fw_container_items');
      expect(pageSrc).toContain('container_assignment');
    });
  });

  // =========================================================================
  // D. SERVER ACTIONS
  // =========================================================================
  describe('Forwarding server actions', () => {
    const actionsSrc = readFile('lib/actions/forwardingActions.ts');

    test('fetchForwardingMasterPrices exists', () => {
      expect(actionsSrc).toContain('fetchForwardingMasterPrices');
    });

    test('fetchForwardingMasterPrices enforces commercial:read', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:read\')');
    });

    test('fetchForwardingMasterPrices queries fw_price_master server-side', () => {
      expect(actionsSrc).toContain("from('fw_price_master')");
    });

    test('getForwardingWorkOrderDetail exists', () => {
      expect(actionsSrc).toContain('getForwardingWorkOrderDetail');
    });

    test('getForwardingWorkOrderDetail enforces commercial:read', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:read\')');
    });

    test('getForwardingWorkOrderDetail queries work_orders server-side', () => {
      expect(actionsSrc).toContain("from('work_orders')");
    });

    test('getForwardingWorkOrderDetail includes forwarding container details', () => {
      expect(actionsSrc).toContain('fw_container_items');
      expect(actionsSrc).toContain('fw_container_assignments');
    });
  });

  // =========================================================================
  // E. API ENDPOINT
  // =========================================================================
  describe('Forwarding WO API endpoint', () => {
    const routeSrc = readFile('app/api/forwarding/wo/route.ts');

    test('endpoint delegates to createForwardingWorkOrder', () => {
      expect(routeSrc).toContain('createForwardingWorkOrder');
    });

    test('endpoint creates forwarding order header via canonical service', () => {
      expect(routeSrc).toContain('ForwardingService');
      expect(routeSrc).toContain('createOrderHeader');
    });

    test('endpoint returns order_header_id in response', () => {
      expect(routeSrc).toContain('order_header_id');
    });

    test('endpoint returns tracking_token in response', () => {
      expect(routeSrc).toContain('tracking_token');
    });
  });

  // =========================================================================
  // F. SCOPE INTEGRITY
  // =========================================================================
  describe('Wave 2 scope integrity', () => {
    test('Wave 2 migration does not touch pricing tables', () => {
      const migrationSrc = readFile(path.join('supabase', 'migrations', '20260906_055_fw_order_headers_lineage_repair.sql'));
      expect(migrationSrc).not.toContain('fw_price_master');
      expect(migrationSrc).not.toContain('crm_sbu_customer_rates');
      expect(migrationSrc).not.toContain('md_billing_rates');
      expect(migrationSrc).not.toContain('cogs');
    });

    test('no ADR-083 implementation', () => {
      const adr083 = readFile('docs/architecture/ADR-083-legacy-pricing-decommissioning.md');
      expect(adr083).toContain('RATIFIED');
    });
  });
});
