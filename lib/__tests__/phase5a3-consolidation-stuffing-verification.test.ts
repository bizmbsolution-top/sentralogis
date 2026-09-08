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

describe('Phase 5A Wave 3 Consolidation + Stuffing Verification', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // CONSOLIDATION AUTHORITY & TENANT ISOLATION
  // =========================================================================

  describe('Consolidation schema and RLS', () => {
    test('fw_consolidations has tenant_isolation RLS policy', () => {
      expect(allSql).toContain('fw_consolidations_tenant_isolation');
      expect(allSql).toContain('get_my_tenant_id()');
    });

    test('fw_consolidations has unique constraint on (tenant_id, consol_number)', () => {
      expect(allSql).toContain('fw_consolidations_number_unique');
    });

    test('fw_consolidations has tenant index', () => {
      expect(allSql).toContain('idx_fw_consolidations_tenant');
    });

    test('fw_container_assignments has tenant_isolation RLS policy', () => {
      expect(allSql).toContain('fw_container_assignments_tenant_isolation');
      expect(allSql).toContain('get_my_tenant_id()');
    });

    test('fw_container_assignments has consolidation FK', () => {
      expect(allSql).toContain('REFERENCES fw_consolidations(id) ON DELETE CASCADE');
    });

    test('fw_container_items has tenant_isolation RLS policy', () => {
      expect(allSql).toContain('fw_container_items_tenant_isolation');
      expect(allSql).toContain('get_my_tenant_id()');
    });

    test('fw_container_items has container_assignment FK', () => {
      expect(allSql).toContain('REFERENCES fw_container_assignments(id) ON DELETE CASCADE');
    });
  });

  // =========================================================================
  // CONSOLIDATION NUMBER AUTHORITY
  // =========================================================================

  describe('Consolidation number authority', () => {
    test('next_consol_number() exists with canonical pattern', () => {
      expect(allSql).toContain('CREATE OR REPLACE FUNCTION public.next_consol_number(p_tenant_id UUID)');
      expect(allSql).toContain('SECURITY DEFINER');
      expect(allSql).toContain("SET search_path = public");
      expect(allSql).toContain('nextval(\'public.fw_consolidation_seq\')');
      expect(allSql).toContain('FWD-');
    });

    test('trigger calls next_consol_number()', () => {
      expect(allSql).toContain('NEW.consol_number := public.next_consol_number(NEW.tenant_id)');
    });

    test('consol_number has canonical COMMENT', () => {
      expect(allSql).toContain('Client MUST NOT generate canonical consol numbers');
    });
  });

  // =========================================================================
  // CONSOLIDATION CREATION API
  // =========================================================================

  describe('Consolidation creation API', () => {
    test('server API route exists for consolidation creation', () => {
      const apiRoute = readFile('app/api/forwarding/consol/route.ts');
      expect(apiRoute).toContain('export async function POST');
      expect(apiRoute).toContain('resolveSessionIdentity');
      expect(apiRoute).toContain('assertPermission');
      expect(apiRoute).toContain('commercial:manage');
    });

    test('consolidation creation API uses tenant from context, not body', () => {
      const apiRoute = readFile('app/api/forwarding/consol/route.ts');
      expect(apiRoute).toContain('ctx.tenantId');
      expect(apiRoute).not.toMatch(/body\.tenant_id/);
    });

    test('consolidation creation API does not accept client consol_number', () => {
      const apiRoute = readFile('app/api/forwarding/consol/route.ts');
      const insertSection = apiRoute.match(/\.insert\(\{[\s\S]*?\}\)/)?.[0] || '';
      expect(insertSection).not.toContain('consol_number');
    });
  });

  // =========================================================================
  // CONSOLIDATION UI — CLIENT MUTATION AUDIT
  // =========================================================================

  describe('Consolidation UI client mutation audit', () => {
    test('consol list page uses server API for creation', () => {
      const listPage = readFile('app/(dashboard)/sbu/forwarding/consol/page.tsx');
      expect(listPage).toContain('/api/forwarding/consol');
      expect(listPage).not.toContain('supabase.from(\'fw_consolidations\').insert');
      expect(listPage).not.toContain('supabase.from("fw_consolidations").insert');
    });

    test('consol list page does not pass tenant_id to API', () => {
      const listPage = readFile('app/(dashboard)/sbu/forwarding/consol/page.tsx');
      expect(listPage).not.toContain('tenant_id:');
    });

    test('stuffing page has no client-side mutations', () => {
      const stuffingPage = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_consolidations\').insert');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_container_assignments\').insert');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_container_items\').insert');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_consolidations\').update');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_container_assignments\').update');
      expect(stuffingPage).not.toContain('supabase.from(\'fw_container_items\').update');
    });

    test('consol detail page has no client-side mutations', () => {
      const detailPage = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx');
      expect(detailPage).not.toContain('supabase.from(\'fw_consolidations\').insert');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_assignments\').insert');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_items\').insert');
      expect(detailPage).not.toContain('supabase.from(\'fw_consolidations\').update');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_assignments\').update');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_items\').update');
    });
  });

  // =========================================================================
  // STUFFING API SECURITY
  // =========================================================================

  describe('Stuffing API security', () => {
    test('stuffing API has authorization', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('resolveSessionIdentity');
      expect(stuffRoute).toContain('assertPermission');
      expect(stuffRoute).toContain('commercial:manage');
    });

    test('stuffing API validates container tenant ownership', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('.eq(\'tenant_id\', tenant_id)');
    });

    test('stuffing API validates container belongs to consolidation', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('container.consolidation_id !== id');
    });

    test('stuffing API checks for duplicate assignments', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('duplicateItems');
      expect(stuffRoute).toContain('sudah di-assign');
    });

    test('stuffing API checks for cross-container assignment', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('otherAssignments');
      expect(stuffRoute).toContain('container lain');
    });

    test('stuffing API validates capacity', () => {
      const stuffRoute = readFile('app/api/forwarding/consol/[id]/stuff/route.ts');
      expect(stuffRoute).toContain('max_volume_cbm');
      expect(stuffRoute).toContain('totalVolume');
      expect(stuffRoute).toContain('melebihi kapasitas');
    });

    test('stuffing page displays volume for items', () => {
      const stuffingPage = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx');
      expect(stuffingPage).toContain('volume_cbm');
      expect(stuffingPage).toContain('CBM');
    });
  });

  // =========================================================================
  // DECONSOL API SECURITY
  // =========================================================================

  describe('Deconsol API security', () => {
    test('deconsol API has authorization', () => {
      const deconsolRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(deconsolRoute).toContain('resolveSessionIdentity');
      expect(deconsolRoute).toContain('assertPermission');
      expect(deconsolRoute).toContain('commercial:manage');
    });

    test('deconsol API validates consolidation tenant ownership', () => {
      const deconsolRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(deconsolRoute).toContain('.eq(\'tenant_id\', tenant_id)');
    });

    test('deconsol API validates consolidation status', () => {
      const deconsolRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(deconsolRoute).toContain('arrived');
      expect(deconsolRoute).toContain('shipped');
    });
  });

  // =========================================================================
  // FCL/LCL INTEGRATION
  // =========================================================================

  describe('FCL/LCL integration', () => {
    test('forwarding writer creates container items with tenant isolation', () => {
      const writerSrc = readFile('lib/application/service-contracts/forwarding-writer.ts');
      expect(writerSrc).toContain('tenant_id: tenantId');
      expect(writerSrc).toContain('insertContainerItem');
    });

    test('forwarding writer uses DB-authoritative WO number', () => {
      const writerSrc = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const woNumberSection = writerSrc.match(/\/\/ ---- Legacy operational case file[\s\S]*?const wo_number =/)?.[0] || '';
      expect(woNumberSection).not.toContain('Math.random');
      expect(woNumberSection).not.toContain('countLegacyWorkOrders');
      expect(writerSrc).toContain('next_forwarding_wo_number');
    });
  });

  // =========================================================================
  // BOX ASSIGNMENTS
  // =========================================================================

  describe('Box assignments', () => {
    test('fw_box_assignments has tenant isolation', () => {
      expect(allSql).toContain('fw_box_assignments_tenant_isolation');
    });

    test('fw_box_assignments has unique constraint', () => {
      expect(allSql).toContain('fw_box_assignments_unique');
    });

    test('fw_box_items has tenant isolation', () => {
      expect(allSql).toContain('fw_box_items_tenant_isolation');
    });
  });
});
