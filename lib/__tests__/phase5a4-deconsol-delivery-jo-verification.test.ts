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

describe('Phase 5A Wave 4 Deconsolidation + Delivery JO Verification', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // DECONSOL API SECURITY
  // =========================================================================

  describe('Deconsol API security', () => {
    test('deconsol API has authorization', () => {
      const route = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(route).toContain('resolveSessionIdentity');
      expect(route).toContain('assertPermission');
      expect(route).toContain('commercial:manage');
    });

    test('deconsol API validates consolidation tenant ownership', () => {
      const route = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(route).toContain(".eq('tenant_id', tenant_id)");
    });

    test('deconsol API validates consolidation status', () => {
      const route = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(route).toContain('arrived');
      expect(route).toContain('shipped');
    });

    test('deconsol API validates container status', () => {
      const route = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(route).toContain('notArrived');
      expect(route).toContain('belum arrived/shipped');
    });

    test('deconsol API uses deterministic idempotency key', () => {
      const service = readFile('lib/domain/forwarding/service.ts');
      expect(service).toContain('idem-deconsol-lastmile-${item.id}');
    });

    test('deconsol API checks for existing delivery SR before creating', () => {
      const service = readFile('lib/domain/forwarding/service.ts');
      expect(service).toContain('existingSr');
      expect(service).toContain('assigned_domain_job_id');
    });

    test('deconsol API validates container item tenant ownership', () => {
      const service = readFile('lib/domain/forwarding/service.ts');
      expect(service).toContain('item.tenant_id !== tenant_id');
    });
  });

  // =========================================================================
  // DECONSOL UI — CLIENT MUTATION AUDIT
  // =========================================================================

  describe('Deconsol UI client mutation audit', () => {
    test('consol detail page uses server action for deconsol', () => {
      const detailPage = readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx');
      expect(detailPage).toContain('deconsolConsolidation');
      expect(detailPage).toContain('from \'@/lib/actions/forwardingActions\'');
      expect(detailPage).not.toContain('supabase.from(\'fw_consolidations\').update');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_assignments\').update');
      expect(detailPage).not.toContain('supabase.from(\'fw_container_items\').update');
    });

    test('deconsol API uses server-derived tenant, not body', () => {
      const apiRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
      expect(apiRoute).toContain('ctx.tenantId');
      expect(apiRoute).not.toMatch(/body\.tenant_id/);
    });
  });

  // =========================================================================
  // JO NUMBER AUTHORITY
  // =========================================================================

  describe('JO number authority', () => {
    test('seq_jo_number exists in migrations', () => {
      expect(allSql).toContain('CREATE SEQUENCE IF NOT EXISTS seq_jo_number');
    });

    test('job_orders has unique constraint on jo_number', () => {
      expect(allSql).toContain('UNIQUE (tenant_id, jo_number)');
    });

    test('job_orders has RLS policy', () => {
      expect(allSql).toContain('tr_jo_isolation');
      expect(allSql).toContain('get_my_tenant_id()');
    });

    test('trucking adapter generates JO number (known broader issue)', () => {
      const adapter = readFile('lib/domain/service-contracts/adapters/trucking-adapter.ts');
      expect(adapter).toContain('jo_number');
      expect(adapter).toContain('Math.random');
    });
  });

  // =========================================================================
  // WO → JO LINEAGE
  // =========================================================================

  describe('WO → JO lineage', () => {
    test('trucking adapter resolves canonical lineage before JO creation', () => {
      const adapter = readFile('lib/domain/service-contracts/adapters/trucking-adapter.ts');
      expect(adapter).toContain('resolveTruckingLineage');
      expect(adapter).toContain('wo_item_id: lineage.woItemId');
    });

    test('job_orders references wo_items', () => {
      expect(allSql).toContain('work_order_item_id UUID');
    });
  });

  // =========================================================================
  // SERVICE REQUEST IDEMPOTENCY
  // =========================================================================

  describe('Service Request idempotency', () => {
    test('ServiceRequestService checks idempotency key before insert', () => {
      const service = readFile('lib/domain/service-contracts/service-request-service.ts');
      expect(service).toContain('idempotency_key');
      expect(service).toContain('existing');
    });

    test('ServiceRequestService returns existing request on duplicate key', () => {
      const service = readFile('lib/domain/service-contracts/service-request-service.ts');
      expect(service).toContain('if (existing)');
      expect(service).toContain('return { request: existingReq }');
    });
  });

  // =========================================================================
  // FCL/LCL COMPATIBILITY
  // =========================================================================

  describe('FCL/LCL compatibility', () => {
    test('forwarding writer creates container items with tenant isolation', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      expect(writer).toContain('tenant_id: tenantId');
      expect(writer).toContain('insertContainerItem');
    });

    test('deconsol processes all container items for consolidation', () => {
      const service = readFile('lib/domain/forwarding/service.ts');
      expect(service).toContain('findContainerItemsByConsolidationId');
      const repo = readFile('lib/domain/forwarding/repository.ts');
      expect(repo).toContain('fw_container_items');
    });
  });

  // =========================================================================
  // RLS VERIFICATION
  // =========================================================================

  describe('RLS verification', () => {
    test('fw_consolidations has tenant isolation RLS', () => {
      expect(allSql).toContain('fw_consolidations_tenant_isolation');
    });

    test('fw_container_assignments has tenant isolation RLS', () => {
      expect(allSql).toContain('fw_container_assignments_tenant_isolation');
    });

    test('fw_container_items has tenant isolation RLS', () => {
      expect(allSql).toContain('fw_container_items_tenant_isolation');
    });

    test('job_orders has tenant isolation RLS', () => {
      expect(allSql).toContain('tr_jo_isolation');
    });
  });
});
