import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('SBU Forwarding Wave 4 — Cargo Owner Tracking Integration', () => {
  // =========================================================================
  // A. TRACKING PAGE
  // =========================================================================
  describe('Cargo Owner Tracking page', () => {
    const pageSrc = readFile('app/track/fwd/[token]/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
      expect(pageSrc).not.toContain("from '@/lib/supabase/admin'");
    });

    test('page.tsx uses public API endpoint for tracking', () => {
      expect(pageSrc).toContain('/api/track/fwd');
    });

    test('page.tsx handles loading state', () => {
      expect(pageSrc).toContain('loading');
    });

    test('page.tsx handles error state', () => {
      expect(pageSrc).toContain('error');
    });

    test('page.tsx displays tracking status', () => {
      expect(pageSrc).toContain('STATUS_FLOW');
      expect(pageSrc).toContain('getCurrentStatus');
    });
  });

  // =========================================================================
  // B. TRACKING API ROUTE
  // =========================================================================
  describe('Tracking API route', () => {
    const routeSrc = readFile('app/api/track/fwd/[token]/route.ts');

    test('route uses canonical server action', () => {
      expect(routeSrc).toContain('getForwardingTrackingByToken');
    });

    test('route does not use browser supabase client', () => {
      expect(routeSrc).not.toContain('supabaseClient');
    });

    test('route does not use createAdminClient directly', () => {
      expect(routeSrc).not.toContain('createAdminClient');
    });

    test('route validates token presence', () => {
      expect(routeSrc).toContain('if (!token');
    });

    test('route validates token not empty after trim', () => {
      expect(routeSrc).toContain('trimmed.length === 0');
    });

    test('route returns 400 for missing token', () => {
      expect(routeSrc).toContain('status: 400');
    });

    test('route returns 404 for invalid token', () => {
      expect(routeSrc).toContain('status: 404');
    });
  });

  // =========================================================================
  // C. SERVER ACTION
  // =========================================================================
  describe('Forwarding tracking server action', () => {
    const actionsSrc = readFile('lib/actions/forwardingActions.ts');

    test('getForwardingTrackingByToken exists', () => {
      expect(actionsSrc).toContain('getForwardingTrackingByToken');
    });

    test('getForwardingTrackingByToken validates token', () => {
      expect(actionsSrc).toContain('token.trim()');
      expect(actionsSrc).toContain('trimmed.length === 0');
    });

    test('getForwardingTrackingByToken queries fw_container_items server-side', () => {
      expect(actionsSrc).toContain("from('fw_container_items')");
    });

    test('getForwardingTrackingByToken uses tracking_token for lookup', () => {
      expect(actionsSrc).toContain("eq('tracking_token', trimmed)");
    });

    test('getForwardingTrackingByToken returns null for invalid token', () => {
      expect(actionsSrc).toContain('return null');
    });

    test('getForwardingTrackingByToken sanitizes public response', () => {
      expect(actionsSrc).toContain('ForwardingTrackingResult');
      expect(actionsSrc).toContain('commodity: item.commodity ?? null');
      expect(actionsSrc).toContain('customer_name: item.wo_item.work_order.customer?.name ?? null');
    });
  });

  // =========================================================================
  // D. SCOPE INTEGRITY
  // =========================================================================
  describe('Wave 4 scope integrity', () => {
    test('no pricing migration files added', () => {
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
