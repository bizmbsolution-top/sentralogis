import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('SBU Forwarding Wave 1 — Canonical Domain Foundation', () => {
  // =========================================================================
  // A. FORWARDING DOMAIN FOUNDATION
  // =========================================================================
  describe('Forwarding Domain Service', () => {
    const serviceSrc = readFile('lib/domain/forwarding/service.ts');

    test('service.ts exists', () => {
      expect(serviceSrc.length).toBeGreaterThan(0);
    });

    test('service enforces commercial:manage on mutations', () => {
      expect(serviceSrc).toContain('assertPermission(ctx, \'commercial:manage\')');
    });

    test('service uses server-derived tenant isolation', () => {
      expect(serviceSrc).toContain('ctx.tenantId');
    });

    test('service delegates persistence to repository', () => {
      expect(serviceSrc).toContain('ForwardingRepository');
      expect(serviceSrc).toContain('this.repo');
    });

    test('service exposes createOrderHeader', () => {
      expect(serviceSrc).toContain('createOrderHeader');
    });

    test('service exposes getOrderHeader', () => {
      expect(serviceSrc).toContain('getOrderHeader');
    });

    test('service exposes listOrderHeaders', () => {
      expect(serviceSrc).toContain('listOrderHeaders');
    });

    test('service exposes createConsolidation', () => {
      expect(serviceSrc).toContain('createConsolidation');
    });

    test('service exposes createContainerAssignment', () => {
      expect(serviceSrc).toContain('createContainerAssignment');
    });

    test('service exposes createContainerItem', () => {
      expect(serviceSrc).toContain('createContainerItem');
    });
  });

  describe('Forwarding Repository', () => {
    const repoSrc = readFile('lib/domain/forwarding/repository.ts');

    test('repository.ts exists', () => {
      expect(repoSrc.length).toBeGreaterThan(0);
    });

    test('repository uses supabaseAdmin for persistence', () => {
      expect(repoSrc).toContain('supabaseAdmin');
    });

    test('repository creates fw_order_headers', () => {
      expect(repoSrc).toContain("from('fw_order_headers')");
    });

    test('repository creates fw_consolidations', () => {
      expect(repoSrc).toContain("from('fw_consolidations')");
    });

    test('repository creates fw_container_assignments', () => {
      expect(repoSrc).toContain("from('fw_container_assignments')");
    });

    test('repository creates fw_container_items', () => {
      expect(repoSrc).toContain("from('fw_container_items')");
    });

    test('repository scopes queries by tenant_id', () => {
      expect(repoSrc).toContain('tenant_id');
    });
  });

  // =========================================================================
  // B. LINEAGE MIGRATION
  // =========================================================================
  describe('fw_order_headers lineage repair', () => {
    const migrationName = '20260906_055_fw_order_headers_lineage_repair.sql';
    const migrationSrc = readFile(path.join('supabase', 'migrations', migrationName));

    test('lineage migration exists', () => {
      expect(migrationSrc.length).toBeGreaterThan(0);
    });

    test('adds work_order_id column', () => {
      expect(migrationSrc).toContain('ADD COLUMN IF NOT EXISTS work_order_id UUID');
    });

    test('backfills work_order_id from legacy wo_id via legacy_wo_bridge', () => {
      expect(migrationSrc).toContain('legacy_wo_bridge');
      expect(migrationSrc).toContain('UPDATE public.fw_order_headers');
      expect(migrationSrc).toContain('SET work_order_id = lb.engagement_id');
    });

    test('adds FK to commercial_work_orders(id)', () => {
      expect(migrationSrc).toContain('REFERENCES public.commercial_work_orders(id)');
    });

    test('uses NOT VALID for safe rollout', () => {
      expect(migrationSrc).toContain('NOT VALID');
    });

    test('validates constraint after backfill', () => {
      expect(migrationSrc).toContain('VALIDATE CONSTRAINT fk_fw_order_headers_work_order');
    });

    test('preserves legacy wo_id column', () => {
      expect(migrationSrc).toContain('PRESERVE legacy wo_id column');
    });
  });

  // =========================================================================
  // C. BROWSER-DIRECT SUPABASE REPAIR
  // =========================================================================
  describe('Forwarding WO list browser-direct Supabase repair', () => {
    const pageSrc = readFile('app/(dashboard)/sbu/forwarding/wo/page.tsx');

    test('page.tsx no longer imports browser supabase client', () => {
      expect(pageSrc).not.toContain("from '@/lib/supabaseClient'");
    });

    test('page.tsx uses server action for data fetching', () => {
      expect(pageSrc).toContain('fetchForwardingWorkOrders');
    });

    test('page.tsx imports from canonical forwarding actions', () => {
      expect(pageSrc).toContain("forwardingActions");
    });

    test('page.tsx has no direct supabase query calls', () => {
      expect(pageSrc).not.toContain('.from(');
      expect(pageSrc).not.toContain('.select(');
      expect(pageSrc).not.toContain('.eq(');
    });
  });

  // =========================================================================
  // D. SCOPE INTEGRITY
  // =========================================================================
  describe('Wave 1 scope integrity', () => {
    test('Wave 1 migration does not touch pricing tables', () => {
      const migrationSrc = readFile(path.join('supabase', 'migrations', '20260906_055_fw_order_headers_lineage_repair.sql'));
      expect(migrationSrc).not.toContain('fw_price_master');
      expect(migrationSrc).not.toContain('crm_sbu_customer_rates');
      expect(migrationSrc).not.toContain('md_billing_rates');
      expect(migrationSrc).not.toContain('cogs');
    });

    test('ADR-083 remains ratified and untouched by Wave 1', () => {
      const adr083 = readFile('docs/architecture/ADR-083-legacy-pricing-decommissioning.md');
      expect(adr083).toContain('RATIFIED');
      expect(adr083).toContain('Phase 5C Formal Ratification');
    });
  });
});
