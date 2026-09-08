/**
 * Sentralogis — Phase 5B
 * lib/__tests__/phase5b-customs-forwarding-orchestration.test.ts
 *
 * CUSTOMS-FORWARDING OPERATIONAL ORCHESTRATION ACCEPTANCE TEST SUITE
 *
 * Verifies that the canonical trigger `createCustomsDeclarationForForwardingHandoff`
 * is correctly wired into the Operational Handoff lifecycle and that the
 * Forwarding → Customs orchestration respects ADR-019, ADR-047, and ADR-053.
 *
 * Governing ADRs: ADR-019, ADR-047, ADR-053
 * Scope: Discovery + implementation verification. Zero production code changes.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
import {
  createOperationalHandoff,
  performOperationalHandoffAction,
  findOperationalHandoffById,
  listOperationalHandoffsByFulfillment,
  _setOperationalHandoffDbClient,
  OperationalHandoffDbClient,
} from '@/lib/operational-handoff/service';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { CustomsAttachmentService } from '@/lib/domain/customs/attachment-service';
import { OperationalHandoffError } from '@/lib/operational-handoff/types';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function makeContext(
  tenantId = TENANT_A,
  permissions: IdentityPermission[] = ['commercial:manage', 'commercial:read'],
): IdentityContext {
  return {
    userId: USER_A,
    tenantId,
    membershipId: 'mem-1',
    role: 'commercial_manager',
    isTenantOwner: false,
    permissions,
    sbuScope: null,
  };
}

function readDoc(filename: string): string {
  const p = path.join(DOCS_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function readAllMigrations(): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

// Mock DB for Phase 5B orchestration tests
class Phase5BMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public salesOrders: Record<string, unknown>[] = [];
  public declarations: Record<string, unknown>[] = [];
  public nextInsertUniqueViolation = false;
  private seqCounter = 600;

  rpc(fn: string, _args: Record<string, unknown>): Promise<{ data: unknown; error: null | { message: string; code?: string } }> {
    if (fn === 'next_operational_handoff_number') {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const num = `OH-${year}-${month}-${String(this.seqCounter++).padStart(4, '0')}`;
      return Promise.resolve({ data: num, error: null });
    }
    return Promise.resolve({ data: null, error: { message: `Unknown RPC: ${fn}` } });
  }

  from(table: string) {
    const self = this;
    let filters: Array<{ col: string; val: unknown }> = [];

    const queryChain: any = {
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return queryChain;
      },
      in(_col: string, _vals: unknown[]) {
        return queryChain;
      },
      order(_col: string, _opts: { ascending: boolean }) {
        return queryChain;
      },
      limit(_count: number) {
        return queryChain;
      },
      then(onfulfilled: any) {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        return Promise.resolve(onfulfilled({ data: rows, error: null }));
      },
      async single() {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        if (rows.length === 0) return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        return { data: { ...rows[0] }, error: null };
      },
      async maybeSingle() {
        const rows = self.getTableData(table).filter((r) =>
          filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows.length > 0 ? { ...rows[0] } : null, error: null };
      },
    };

    return {
      select(_cols?: string) {
        return queryChain;
      },
      insert(rowOrRows: Record<string, unknown> | Record<string, unknown>[]) {
        const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows;
        return {
          select(_cols?: string) {
            return {
              async single() {
                if (self.nextInsertUniqueViolation) {
                  self.nextInsertUniqueViolation = false;
                  return { data: null, error: { message: 'unique violation', code: '23505' } };
                }
                const inserted = {
                  id: row.id || `oh-5b-${Date.now()}-${Math.random()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...row,
                };
                self.getTableData(table).push(inserted);
                return { data: { ...inserted }, error: null };
              },
              async maybeSingle() {
                return this.single();
              },
            };
          },
        };
      },
      update(patch: Record<string, unknown>) {
        const updateChain: any = {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return updateChain;
          },
          then(onfulfilled: any) {
            const list = self.getTableData(table);
            const updated: Record<string, unknown>[] = [];
            for (let i = 0; i < list.length; i++) {
              if (filters.every((f) => list[i][f.col] === f.val)) {
                list[i] = { ...list[i], ...patch, updated_at: new Date().toISOString() };
                updated.push({ ...list[i] });
              }
            }
            return Promise.resolve(onfulfilled ? onfulfilled({ data: updated, error: null }) : { data: updated, error: null });
          },
          async select(_cols?: string) {
            return updateChain.then((res: any) => res);
          },
        };
        return updateChain;
      },
      delete() {
        return {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return this;
          },
          async select() {
            return { data: [], error: null };
          },
        };
      },
    };
  }

  private getTableData(table: string): Record<string, unknown>[] {
    if (table === 'operational_handoffs') return this.handoffs;
    if (table === 'fulfillments') return this.fulfillments;
    if (table === 'fulfillment_allocations') return this.allocations;
    if (table === 'sales_orders') return this.salesOrders;
    if (table === 'cus_declarations') return this.declarations;
    return [];
  }
}

export async function runPhase5BCustomsForwardingOrchestrationSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  let passed = 0;
  let failed = 0;

  function check(gate: string, desc: string, ok: boolean, detail?: string) {
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${gate}: ${desc}${detail ? ` — ${detail}` : ''}`);
    }
  }

  async function checkAsync(gate: string, desc: string, fn: () => Promise<boolean>, detail?: string) {
    try {
      const ok = await fn();
      check(gate, desc, ok, detail);
    } catch (err: any) {
      check(gate, desc, false, err?.message || detail);
    }
  }

  const migrations = readAllMigrations();
  const allSql = migrations.join('\n');
  const handoffServiceSrc = fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8');

  // ========================================================================
  // SETUP
  // ========================================================================

  const mockDb = new Phase5BMockDb();
  _setOperationalHandoffDbClient(mockDb as unknown as OperationalHandoffDbClient);

  const soId = 'so-5b-001';
  const flId = 'fl-5b-001';
  const allocFwd = 'alloc-5b-fwd';
  const allocCus = 'alloc-5b-cus';
  const shipmentId = 'shp-5b-001';

  mockDb.salesOrders.push({ id: soId, tenant_id: TENANT_A, status: 'CONFIRMED', total_amount: 150000000 });
  mockDb.fulfillments.push({ id: flId, tenant_id: TENANT_A, sales_order_id: soId, status: 'ACTIVE', revision_no: 1 });
  mockDb.allocations.push(
    { id: allocFwd, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'FORWARDING', allocated_quantity: 1, delivered_quantity: 0 },
    { id: allocCus, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'CUSTOMS', allocated_quantity: 1, delivered_quantity: 0 },
  );

  // ========================================================================
  // SECTION 1: STATIC ARCHITECTURE VERIFICATION
  // ========================================================================

  // 5B-S01: Trigger exists in handoff accept case
  check(
    '5B-S01',
    'Static: createCustomsDeclarationForForwardingHandoff is invoked in accept case for FORWARDING domain',
    /targetDomain\s*===\s*['"]FORWARDING['"]\s*&&\s*current\.fulfillmentAllocationId/.test(handoffServiceSrc) &&
      /createCustomsDeclarationForForwardingHandoff\(current,\s*context\)/.test(handoffServiceSrc),
  );

  // 5B-S02: International shipping detection logic exists
  check(
    '5B-S02',
    'Static: hasInternationalShippingCharacteristics checks vessel/voyage/shipping_line/BL fields',
    /vessel_name|voyage_no|shipping_line_name|bill_of_lading|master_bl_number|house_bl_number/.test(handoffServiceSrc),
  );

  // 5B-S03: Customs declaration creation uses canonical CustomsService
  check(
    '5B-S03',
    'Static: createCustomsDeclarationForForwardingHandoff uses CustomsService.createDeclaration()',
    /new\s+CustomsService\(\)/.test(handoffServiceSrc) &&
      /customsService\.createDeclaration\(dto\)/.test(handoffServiceSrc),
  );

  // 5B-S04: Attachment uses canonical CustomsAttachmentService
  check(
    '5B-S04',
    'Static: createCustomsDeclarationForForwardingHandoff uses CustomsAttachmentService.attachShipment()',
    /CustomsAttachmentService\.attachShipment\(/.test(handoffServiceSrc),
  );

  // 5B-S05: assigned_domain_reference is updated after declaration creation
  check(
    '5B-S05',
    'Static: assigned_domain_reference is updated with DECLARATION reference after customs creation',
    /referenceType:\s*['"]DECLARATION['"]/.test(handoffServiceSrc) &&
      /referenceId:\s*declaration\.id/.test(handoffServiceSrc),
  );

  // 5B-S06: Control Tower remains read-only (no direct cus_declarations mutation)
  const controlTowerSrc = fs.readFileSync(path.join(LIB_DIR, 'control-tower', 'service.ts'), 'utf8');
  check(
    '5B-S06',
    'Static: Control Tower service has zero direct cus_declarations mutations',
    !/\.from\(['"]cus_declarations['"]\)\.(insert|update|delete|upsert)/.test(controlTowerSrc),
  );

  // ========================================================================
  // SECTION 2: BEHAVIORAL ORCHESTRATION TESTS
  // ========================================================================

  // 5B-B01: Forwarding handoff WITH international characteristics auto-creates Customs declaration
  await checkAsync('5B-B01', 'Behavioral: Forwarding handoff with vessel/voyage/BL auto-creates Customs declaration on accept', async () => {
    const ctx = makeContext();

    let createdDeclaration: { id: string; declaration_number: string; tenant_id: string } | null = null;
    let attachCalled = false;

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;
    const originalAttachShipment = CustomsAttachmentService.attachShipment;

    try {
      CustomsService.prototype.createDeclaration = async function(dto: any) {
        createdDeclaration = {
          id: `decl-5b-${Date.now()}`,
          declaration_number: 'DEC-5B-AUTO-001',
          tenant_id: dto.tenant_id,
        };
        mockDb.declarations.push({
          id: createdDeclaration.id,
          tenant_id: dto.tenant_id,
          declaration_number: createdDeclaration.declaration_number,
          importer_id: dto.importer_id,
          status: 'DRAFT',
        });
        return createdDeclaration as any;
      };

      CustomsAttachmentService.attachShipment = function() {
        attachCalled = true;
        return { success: true, action: 'ATTACHED' } as any;
      };

      const created = await createOperationalHandoff(ctx, {
        fulfillmentId: flId,
        fulfillmentAllocationId: allocFwd,
        targetDomain: 'FORWARDING',
        requestPayload: {
          shipmentId,
          importer_entity_id: 'ent-5b-001',
          vessel_name: 'MV SENTRALOGIS',
          voyage_no: 'V001',
          bill_of_lading: 'BL-5B-001',
          master_bl_number: 'MBL-5B-001',
        },
      });

      const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });

      const statusOk = accepted.status === 'ACCEPTED';
      const referenceOk = accepted.assignedDomainReference?.referenceType === 'SHIPMENT' &&
                          accepted.assignedDomainReference?.referenceId === shipmentId;
      const declarationOk = createdDeclaration !== null;
      const attachmentOk = attachCalled === true;

      return statusOk && referenceOk && declarationOk && attachmentOk;
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
      CustomsAttachmentService.attachShipment = originalAttachShipment;
    }
  });

  // 5B-B02: Forwarding handoff WITHOUT international characteristics does NOT create Customs declaration
  await checkAsync('5B-B02', 'Behavioral: Forwarding handoff without vessel/BL does NOT auto-create Customs declaration', async () => {
    const ctx = makeContext();

    let createDeclarationCalled = false;

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;

    try {
      CustomsService.prototype.createDeclaration = async function() {
        createDeclarationCalled = true;
        throw new Error('Should not be called');
      };

      const created = await createOperationalHandoff(ctx, {
        fulfillmentId: flId,
        fulfillmentAllocationId: allocFwd,
        targetDomain: 'FORWARDING',
        requestPayload: {
          shipmentId,
          importer_entity_id: 'ent-5b-001',
          origin_port: 'IDJKT',
          destination_port: 'IDBDG',
        },
      });

      const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });

      return accepted.status === 'ACCEPTED' && createDeclarationCalled === false;
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
    }
  });

  // 5B-B03: Missing importer_entity_id throws error
  await checkAsync('5B-B03', 'Behavioral: Missing importer_entity_id throws MISSING_IMPORTER_ENTITY error', async () => {
    const ctx = makeContext();

    const created = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      requestPayload: {
        shipmentId,
        vessel_name: 'MV SENTRALOGIS',
        voyage_no: 'V001',
        bill_of_lading: 'BL-5B-001',
      },
    });

    try {
      await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'MISSING_IMPORTER_ENTITY';
    }
  });

  // 5B-B04: Customs declaration DTO includes shipment_id when available
  await checkAsync('5B-B04', 'Behavioral: Customs declaration DTO includes shipment_id when available in handoff payload', async () => {
    const ctx = makeContext();

    let capturedDto: any = null;

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;

    try {
      CustomsService.prototype.createDeclaration = async function(dto: any) {
        capturedDto = dto;
        return {
          id: `decl-5b-${Date.now()}`,
          declaration_number: 'DEC-5B-DTO-001',
          tenant_id: dto.tenant_id,
          shipment_id: dto.shipment_id,
        } as any;
      };

      CustomsAttachmentService.attachShipment = function() {
        return { success: true, action: 'ATTACHED' } as any;
      };

      const created = await createOperationalHandoff(ctx, {
        fulfillmentId: flId,
        fulfillmentAllocationId: allocFwd,
        targetDomain: 'FORWARDING',
        requestPayload: {
          shipmentId,
          importer_entity_id: 'ent-5b-001',
          vessel_name: 'MV SENTRALOGIS',
          voyage_no: 'V001',
        },
      });

      await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });

      return capturedDto !== null &&
             capturedDto.shipment_id === shipmentId &&
             capturedDto.tenant_id === TENANT_A &&
             capturedDto.importer_id === 'ent-5b-001';
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
    }
  });

  // 5B-B05: Attachment failure does not falsely complete handoff
  await checkAsync('5B-B05', 'Behavioral: Customs attachment failure throws SHIPMENT_ATTACHMENT_FAILED and preserves ISSUED status', async () => {
    const ctx = makeContext();

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;
    const originalAttachShipment = CustomsAttachmentService.attachShipment;

    try {
      CustomsService.prototype.createDeclaration = async function() {
        return {
          id: 'decl-5b-fail',
          declaration_number: 'DEC-5B-FAIL',
          tenant_id: TENANT_A,
        } as any;
      };

      CustomsAttachmentService.attachShipment = function() {
        return {
          success: false,
          action: 'FAILED',
          message: 'Simulated attachment failure',
        } as any;
      };

      const created = await createOperationalHandoff(ctx, {
        fulfillmentId: flId,
        fulfillmentAllocationId: allocFwd,
        targetDomain: 'FORWARDING',
        requestPayload: {
          shipmentId,
          importer_entity_id: 'ent-5b-001',
          vessel_name: 'MV SENTRALOGIS',
          voyage_no: 'V001',
        },
      });

      try {
        await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
        return false;
      } catch (err: any) {
        const isCorrectError = err instanceof OperationalHandoffError && err.code === 'SHIPMENT_ATTACHMENT_FAILED';
        const handoffAfter = mockDb.handoffs.find((row: any) => row.id === created.handoff.id);
        const preserved = handoffAfter?.status === 'ISSUED' && !handoffAfter?.assigned_domain_reference;
        return isCorrectError && preserved;
      }
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
      CustomsAttachmentService.attachShipment = originalAttachShipment;
    }
  });

  // 5B-B06: Non-FORWARDING domain does not trigger Customs creation
  await checkAsync('5B-B06', 'Behavioral: Non-FORWARDING domain (e.g., TRUCKING) does NOT trigger Customs declaration creation', async () => {
    const ctx = makeContext();

    let createDeclarationCalled = false;

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;

    try {
      CustomsService.prototype.createDeclaration = async function() {
        createDeclarationCalled = true;
        throw new Error('Should not be called');
      };

      const created = await createOperationalHandoff(ctx, {
        fulfillmentId: flId,
        fulfillmentAllocationId: allocCus,
        targetDomain: 'CUSTOMS',
        requestPayload: {
          declarationId: 'dec-5b-002',
          ajuNumber: '000000-000000-20260907-000001',
        },
      });

      const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });

      return accepted.status === 'ACCEPTED' && createDeclarationCalled === false;
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
    }
  });

  // 5B-B07: Control Tower reads handoff with Customs domain reference
  await checkAsync('5B-B07', 'Behavioral: Control Tower workspace reads handoffs including Customs-Forwarding orchestration', async () => {
    const ctx = makeContext();

    const handoffs = await listOperationalHandoffsByFulfillment(ctx, flId);
    const hasCustomsHandoff = handoffs.some((h) => h.targetDomain === 'FORWARDING');

    return hasCustomsHandoff;
  });

  // ========================================================================
  // SECTION 3: NEGATIVE ARCHITECTURE GUARDS
  // ========================================================================

  // 5B-N01: No direct CEISA transmission in handoff domain
  check(
    '5B-N01',
    'Negative Guard 1: Zero direct CEISA transmissions in Operational Handoff domain',
    !/ceisa_status|ceisa_transmission|ceisa_xml|ceisa_edi/i.test(handoffServiceSrc),
  );

  // 5B-N02: No HS classification mutations in handoff domain
  check(
    '5B-N02',
    'Negative Guard 2: Zero HS classification mutations in Operational Handoff domain',
    !/hs_code|classification_line|tariff_code/i.test(handoffServiceSrc),
  );

  // 5B-N03: No duty/tax mutations in handoff domain
  check(
    '5B-N03',
    'Negative Guard 3: Zero duty/tax mutations in Operational Handoff domain',
    !/duty_amount|cif_amount|bm_amount|ppn_amount|pph_amount/i.test(handoffServiceSrc),
  );

  // 5B-N04: No client-generated Customs declaration number
  check(
    '5B-N04',
    'Negative Guard 4: Zero client-generated declaration numbers in handoff domain',
    !/generateCustomsNumber|generateAjuNumber|generateDeclarationNumber/i.test(handoffServiceSrc),
  );

  // ========================================================================
  // CLEANUP
  // ========================================================================

  _setOperationalHandoffDbClient(null);

  console.log(`\nPhase 5B Customs-Forwarding Orchestration Suite: ${passed} / ${passed + failed} PASSED\n`);
  return { passed, failed, total: passed + failed };
}
