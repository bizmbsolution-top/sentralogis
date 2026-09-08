import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('SBU Forwarding Wave 3 — Consol Manager Integration', () => {
  // =========================================================================
  // A. CONSOL LIST PAGE
  // =========================================================================
  describe('Consol List page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/consol/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('fetchConsolidations');
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
  // B. CONSOL DETAIL PAGE
  // =========================================================================
  describe('Consol Detail page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('getConsolidationDetail');
    });

    test('page.tsx imports from canonical forwarding actions', () => {
      expect(pageSrc).toContain('forwardingActions');
    });

    test('page.tsx has no direct supabase query calls', () => {
      expect(pageSrc).not.toContain('.from(');
      expect(pageSrc).not.toContain('.select(');
      expect(pageSrc).not.toContain('.eq(');
    });

    test('page.tsx uses canonical deconsol action', () => {
      expect(pageSrc).toContain('deconsolConsolidation');
    });
  });

  // =========================================================================
  // C. STUFFING PAGE
  // =========================================================================
  describe('Stuffing page', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx');

    test('page.tsx does not import browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('getConsolidationDetail');
    });

    test('page.tsx uses server action for stuffing', () => {
      expect(pageSrc).toContain('stuffContainer');
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
  // D. SERVER ACTIONS
  // =========================================================================
  describe('Forwarding server actions', () => {
    const actionsSrc = readFile('lib/actions/forwardingActions.ts');

    test('fetchConsolidations exists', () => {
      expect(actionsSrc).toContain('fetchConsolidations');
    });

    test('fetchConsolidations enforces commercial:read', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:read\')');
    });

    test('fetchConsolidations queries fw_consolidations server-side', () => {
      expect(actionsSrc).toContain("from('fw_consolidations')");
    });

    test('getConsolidationDetail exists', () => {
      expect(actionsSrc).toContain('getConsolidationDetail');
    });

    test('getConsolidationDetail enforces commercial:read', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:read\')');
    });

    test('getConsolidationDetail includes container assignments', () => {
      expect(actionsSrc).toContain('fw_container_assignments');
    });

    test('getConsolidationDetail includes container items', () => {
      expect(actionsSrc).toContain('fw_container_items');
    });

    test('stuffContainer exists', () => {
      expect(actionsSrc).toContain('stuffContainer');
    });

    test('stuffContainer enforces commercial:manage', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:manage\')');
    });

    test('deconsolConsolidation exists', () => {
      expect(actionsSrc).toContain('deconsolConsolidation');
    });

    test('deconsolConsolidation enforces commercial:manage', () => {
      expect(actionsSrc).toContain('assertPermission(ctx, \'commercial:manage\')');
    });

    test('deconsolConsolidation delegates to canonical ForwardingService for delivery SR creation', () => {
      expect(actionsSrc).toContain('ForwardingService');
      expect(actionsSrc).toContain('deconsolConsolidation(ctx, id, srIssuer)');
      expect(actionsSrc).toContain('ServiceRequestService');
      expect(actionsSrc).toContain('issueRequest(args, true)');
    });
  });

  // =========================================================================
  // E. SCOPE INTEGRITY
  // =========================================================================
  describe('Wave 3 scope integrity', () => {
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
