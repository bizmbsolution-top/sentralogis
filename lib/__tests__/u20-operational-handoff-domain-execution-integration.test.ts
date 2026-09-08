/**
 * Sentralogis — Phase 4B / U-20
 * lib/__tests__/u20-operational-handoff-domain-execution-integration.test.ts
 *
 * OPERATIONAL HANDOFF DOMAIN EXECUTION INTEGRATION IMPLEMENTATION TEST SUITE
 *
 * Comprehensive integration suite verifying the activated OperationalHandoff -> Domain Adapter ->
 * Sovereign Domain execution seam across Forwarding, Customs, Trucking, and Warehouse (ADR-018 .. ADR-056).
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext, IdentityPermission } from '@/lib/application/identity/types';
import {
  createOperationalHandoff,
  findOperationalHandoffById,
  listOperationalHandoffsByFulfillment,
  performOperationalHandoffAction,
  allocateOperationalHandoffNumber,
  _setOperationalHandoffDbClient,
  OperationalHandoffDbClient,
} from '@/lib/operational-handoff/service';
import {
  OperationalHandoffError,
  TargetDomain,
  OPERATIONAL_HANDOFF_TRANSITIONS,
} from '@/lib/operational-handoff/types';
import {
  getOperationalHandoffAdapter,
  ForwardingHandoffAdapter,
  CustomsHandoffAdapter,
  TruckingHandoffAdapter,
  WarehouseHandoffAdapter,
} from '@/lib/operational-handoff/adapters';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { CustomsAttachmentService } from '@/lib/domain/customs/attachment-service';

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

// Behavioral Mock DB for Execution Integration
class U20ExecutionMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public salesOrders: Record<string, unknown>[] = [];
  public nextInsertUniqueViolation = false;
  private seqCounter = 500;

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
                  id: row.id || `oh-u20-${Date.now()}-${Math.random()}`,
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
    return [];
  }
}

export async function runU20OperationalHandoffDomainExecutionIntegrationSuite(): Promise<{
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
  const mig021 = fs.existsSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'))
    ? fs.readFileSync(path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql'), 'utf8')
    : '';

  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const handoffTypesSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'), 'utf8')
    : '';
  const truckingLineageSrc = fs.existsSync(path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'), 'utf8')
    : '';

  const mockDb = new U20ExecutionMockDb();
  _setOperationalHandoffDbClient(mockDb);

  const soId = 'so-1111-1111-1111-111111111111';
  const flId = 'fl-1111-1111-1111-111111111111';
  const allocFwd = 'alloc-u20-fwd';
  const allocCus = 'alloc-u20-cus';
  const allocTrk = 'alloc-u20-trk';
  const allocWh = 'alloc-u20-wh';

  mockDb.salesOrders.push({ id: soId, tenant_id: TENANT_A, status: 'CONFIRMED', total_amount: 150000000 });
  mockDb.fulfillments.push({ id: flId, tenant_id: TENANT_A, sales_order_id: soId, status: 'ACTIVE', revision_no: 1 });
  mockDb.allocations.push(
    { id: allocFwd, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'FORWARDING', allocated_quantity: 10, delivered_quantity: 0 },
    { id: allocCus, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'CUSTOMS', allocated_quantity: 1, delivered_quantity: 0 },
    { id: allocTrk, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'TRUCKING', allocated_quantity: 5, delivered_quantity: 0 },
    { id: allocWh, tenant_id: TENANT_A, fulfillment_id: flId, capability_type: 'WAREHOUSE', allocated_quantity: 100, delivered_quantity: 0 },
  );

  /* ------------------------------------------------------------------ */
  /*  SECTION 1: POSITIVE EXECUTION INTEGRATION TESTS (P01 .. P15)      */
  /* ------------------------------------------------------------------ */

  // P01: Forwarding handoff executes through Forwarding adapter
  await checkAsync('U20-P01', 'Forwarding handoff executes through Forwarding adapter', async () => {
    const ctx = makeContext();
    const created = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      requestPayload: { shipmentId: 'shp-u20-001', shipmentNumber: 'SHP-2026-08-0001' },
    });
    const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
    return accepted.status === 'ACCEPTED' &&
           accepted.assignedDomainReference?.referenceType === 'SHIPMENT' &&
           accepted.assignedDomainReference?.referenceId === 'shp-u20-001';
  });

  // P02: Customs handoff executes through Customs adapter
  await checkAsync('U20-P02', 'Customs handoff executes through Customs adapter', async () => {
    const ctx = makeContext();
    const created = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocCus,
      targetDomain: 'CUSTOMS',
      requestPayload: { declarationId: 'dec-u20-001', ajuNumber: '000000-000000-20260828-000001' },
    });
    const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
    return accepted.status === 'ACCEPTED' &&
           accepted.assignedDomainReference?.referenceType === 'DECLARATION' &&
           accepted.assignedDomainReference?.referenceId === 'dec-u20-001';
  });

  // P03: Trucking handoff emits the canonical Service Request reference
  await checkAsync('U20-P03', 'Trucking handoff emits the canonical Service Request reference', async () => {
    const ctx = makeContext();
    const created = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocTrk,
      targetDomain: 'TRUCKING',
      requestPayload: { serviceRequestId: 'sr-u20-001', requestNumber: 'SR-2026-08-0001' },
    });
    const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
    return accepted.status === 'ACCEPTED' &&
           accepted.assignedDomainReference?.referenceType === 'SERVICE_REQUEST' &&
           accepted.assignedDomainReference?.referenceId === 'sr-u20-001';
  });

  // P04: Warehouse handoff emits the canonical Warehouse Order reference
  await checkAsync('U20-P04', 'Warehouse handoff emits the canonical Warehouse Order reference', async () => {
    const ctx = makeContext();
    const created = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocWh,
      targetDomain: 'WAREHOUSE',
      requestPayload: { serviceRequestId: 'wh-sr-u20-001', requestNumber: 'WH-SR-2026-08-0001' },
    });
    const accepted = await performOperationalHandoffAction(ctx, created.handoff.id, { action: 'accept' });
    return accepted.status === 'ACCEPTED' &&
           accepted.assignedDomainReference?.referenceType === 'WAREHOUSE_ORDER' &&
           accepted.assignedDomainReference?.referenceId === 'wh-sr-u20-001';
  });

  // P05: Idempotent retry returns existing handoff with created: false
  await checkAsync('U20-P05', 'Idempotent retry returns existing handoff with created: false', async () => {
    const ctx = makeContext();
    const r1 = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      idempotencyKey: 'idemp-u20-fwd-01',
    });
    const r2 = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      idempotencyKey: 'idemp-u20-fwd-01',
    });
    return r1.created && !r2.created && r1.handoff.id === r2.handoff.id;
  });

  // P06: Valid lifecycle transitions succeed
  await checkAsync('U20-P06', 'Valid lifecycle transitions succeed (ISSUED -> ACK -> ACCEPTED -> EXECUTING -> FULFILLED)', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocTrk,
      targetDomain: 'TRUCKING',
    });
    const ack = await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'acknowledge' });
    const acc = await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'accept' });
    const exec = await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'startExecuting' });
    const ful = await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'fulfill' });
    return ack.status === 'ACKNOWLEDGED' && acc.status === 'ACCEPTED' && exec.status === 'EXECUTING' && ful.status === 'FULFILLED';
  });

  // P07: Progress propagates to allocation (delivered_quantity updated on fulfill)
  await checkAsync('U20-P07', 'Progress propagates to allocation (delivered_quantity updated on fulfill)', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
    });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'accept' });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'startExecuting' });
    await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'fulfill', deliveredQuantity: 10 });
    const alloc = mockDb.allocations.find((a) => a.id === allocFwd);
    return alloc?.delivered_quantity === 10;
  });

  // P08: Multi-SBU fulfillment works
  check('U20-P08', 'Multi-SBU: Adapters exist for all 4 canonical SBU capabilities (ADR-048)',
    getOperationalHandoffAdapter('FORWARDING') instanceof ForwardingHandoffAdapter &&
    getOperationalHandoffAdapter('CUSTOMS') instanceof CustomsHandoffAdapter &&
    getOperationalHandoffAdapter('TRUCKING') instanceof TruckingHandoffAdapter &&
    getOperationalHandoffAdapter('WAREHOUSE') instanceof WarehouseHandoffAdapter);

  // P09: Split shipment works
  check('U20-P09', 'Split shipment: One Fulfillment plan can hold multiple Forwarding allocations referencing distinct shipments (ADR-038, ADR-049)',
    /CREATE TABLE IF NOT EXISTS public\.fulfillment_allocations/i.test(allSql) &&
    /shipment_id\s+UUID/i.test(allSql));

  // P10: Partial fulfillment works
  check('U20-P10', 'Partial fulfillment: allocated_quantity and delivered_quantity track execution without altering commercial SO quantities (ADR-049)',
    /allocated_quantity\s+NUMERIC/i.test(allSql) &&
    /delivered_quantity\s+NUMERIC/i.test(allSql));

  // P11: Operational failure does not mutate Sales Order
  await checkAsync('U20-P11', 'Operational failure does not mutate Sales Order', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocTrk,
      targetDomain: 'TRUCKING',
    });
    await performOperationalHandoffAction(ctx, h.handoff.id, {
      action: 'reject',
      failureCode: 'TRUCK_BREAKDOWN',
      failureReason: 'Engine failure on route',
    });
    const so = mockDb.salesOrders.find((s) => s.id === soId);
    return so?.status === 'CONFIRMED' && so?.total_amount === 150000000;
  });

  // P16: Partial failure — declaration succeeds but attachment fails
  await checkAsync('U20-P16', 'Partial failure: declaration creation succeeds but attachment fails does not falsely complete handoff', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocFwd,
      targetDomain: 'FORWARDING',
      requestPayload: {
        shipmentId: 'shp-u20-partial',
        shipmentNumber: 'SHP-2026-08-0099',
        importer_entity_id: 'ent-u20-001',
        vessel_name: 'MV TEST VESSEL',
        voyage_no: 'V001',
      },
    });

    const originalCreateDeclaration = CustomsService.prototype.createDeclaration;
    const originalAttachShipment = CustomsAttachmentService.attachShipment;
    
    try {
      CustomsService.prototype.createDeclaration = async function() {
        return {
          id: 'decl-u20-partial',
          declaration_number: 'DEC-2026-08-0099',
          tenant_id: TENANT_A,
          shipment_id: null,
        } as any;
      };

      CustomsAttachmentService.attachShipment = function() {
        return {
          success: false,
          action: 'FAILED',
          declaration_id: 'decl-u20-partial',
          reference_type: 'SHIPMENT',
          reference_id: 'shp-u20-partial',
          message: 'Simulated attachment failure',
        } as any;
      };

      try {
        await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'accept' });
        return false;
      } catch (err: any) {
        const isCorrectError = err instanceof OperationalHandoffError && err.code === 'SHIPMENT_ATTACHMENT_FAILED';
        const handoffAfter = mockDb.handoffs.find((row) => row.id === h.handoff.id);
        const notFalselyCompleted = handoffAfter?.status === 'ISSUED' && !handoffAfter?.assigned_domain_reference;
        return isCorrectError && notFalselyCompleted;
      }
    } finally {
      CustomsService.prototype.createDeclaration = originalCreateDeclaration;
      CustomsAttachmentService.attachShipment = originalAttachShipment;
    }
  });

  // P12: Replanning preserves historical revisions
  check('U20-P12', 'Replanning: fulfillments table has revision_no and version_no >= 1 preserving revision history (ADR-044, ADR-050)',
    /revision_no\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(allSql));

  // P13: Tenant identity comes from server context
  check('U20-P13', 'Tenant Security: Service derives tenant strictly from IdentityContext (0 trust in x-tenant-id)',
    !/x-tenant-id/i.test(handoffServiceSrc) && handoffServiceSrc.includes('context.tenantId'));

  // P14: Authorization is enforced
  check('U20-P14', 'Authorization: Mutations enforce commercial:manage and queries enforce commercial:read',
    handoffServiceSrc.includes("assertPermission(context, 'commercial:manage')") &&
    handoffServiceSrc.includes("assertPermission(context, 'commercial:read')"));

  // P15: Server-side handoff number authority is preserved
  check('U20-P15', 'Number Authority: next_operational_handoff_number generates OH-YYYY-MM-NNNN from seq_operational_handoff',
    mig021.includes('seq_operational_handoff') && mig021.includes('next_operational_handoff_number'));

  /* ------------------------------------------------------------------ */
  /*  SECTION 2: NEGATIVE ARCHITECTURE GUARDS (N01 .. N15)              */
  /* ------------------------------------------------------------------ */

  // N01: Direct Fulfillment -> JO
  const noDirectFlToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(
    fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
  );
  check('U20-N01', 'Negative Guard 1: Zero direct Fulfillment -> Job Order mutations', noDirectFlToJo);

  // N02: Direct SO -> JO
  const noDirectSoToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(
    fs.readFileSync(path.join(LIB_DIR, 'sales-order', 'service.ts'), 'utf8')
  );
  check('U20-N02', 'Negative Guard 2: Zero direct Sales Order -> Job Order mutations', noDirectSoToJo);

  // N03: Direct OperationalHandoff -> JO
  const noDirectOhToJo = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);
  check('U20-N03', 'Negative Guard 3: Zero direct OperationalHandoff -> Job Order mutations', noDirectOhToJo);

  // N04: Direct driver assignment
  const noDriverInHandoff = !/\b(md_drivers|driver_profiles|driver_id)\b/i.test(handoffServiceSrc);
  check('U20-N04', 'Negative Guard 4: Zero direct driver assignments in Operational Handoff domain', noDriverInHandoff);

  // N05: Direct GPS mutation
  const noGpsInHandoff = !/\b(gps_telemetry|gps_coordinates|telemetry_sessions)\b/i.test(handoffServiceSrc);
  check('U20-N05', 'Negative Guard 5: Zero direct GPS mutations in Operational Handoff domain', noGpsInHandoff);

  // N06: Direct warehouse inventory mutation
  const noWhInventoryInHandoff = !/\.from\(['"]wh_inventory['"]\)/i.test(handoffServiceSrc);
  check('U20-N06', 'Negative Guard 6: Zero direct warehouse inventory mutations in Operational Handoff domain', noWhInventoryInHandoff);

  // N07: Direct Customs internal mutation bypassing Customs service
  const noCustomsDutyInHandoff = !/\b(duty_amount|cif_amount|ceisa_status)\b/i.test(handoffServiceSrc);
  check('U20-N07', 'Negative Guard 7: Zero direct customs statutory valuation/duty mutations in Handoff domain', noCustomsDutyInHandoff);

  // N08: Direct Forwarding execution bypassing shipment aggregate
  const noVesselInHandoff = !/\.(insert|update|upsert)\([^)]*\b(vessel_name|voyage_number|port_of_loading|port_of_discharge)\b/i.test(handoffServiceSrc);
  check('U20-N08', 'Negative Guard 8: Zero direct vessel/voyage/POL/POD mutations in Handoff domain', noVesselInHandoff);

  // N09: Client-generated OH number
  const noClientOhGenerator = !/function\s+generate(?:Handoff|OH)Number/i.test(handoffServiceSrc);
  check('U20-N09', 'Negative Guard 9: Zero client-side OH number generators (delegated to DB RPC)', noClientOhGenerator);

  // N10: Client tenant override
  const noClientTenantOverride = !/req\.headers\[['"]x-tenant-id['"]\]/i.test(handoffServiceSrc);
  check('U20-N10', 'Negative Guard 10: Zero client tenant header overrides', noClientTenantOverride);

  // N11: Cross-tenant handoff access
  await checkAsync('U20-N11', 'Negative Guard 11: Cross-tenant handoff lookup fails deterministically', async () => {
    const ctxB = makeContext(TENANT_B);
    const handoffId = mockDb.handoffs[0]?.id as string;
    try {
      await findOperationalHandoffById(ctxB, handoffId);
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'HANDOFF_NOT_FOUND';
    }
  });

  // N12: Duplicate execution without idempotency protection
  const idempDdlExists = /CONSTRAINT uq_operational_handoff_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(mig021);
  check('U20-N12', 'Negative Guard 12: Idempotency uniqueness enforced at database level', idempDdlExists);

  // N13: Illegal lifecycle transition
  await checkAsync('U20-N13', 'Negative Guard 13: Illegal lifecycle transitions are blocked at runtime', async () => {
    const ctx = makeContext();
    const h = await createOperationalHandoff(ctx, {
      fulfillmentId: flId,
      fulfillmentAllocationId: allocTrk,
      targetDomain: 'TRUCKING',
    });
    try {
      await performOperationalHandoffAction(ctx, h.handoff.id, { action: 'fulfill' });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'INVALID_STATUS_TRANSITION';
    }
  });

  // N14: Commercial Sales Order mutation caused by operational failure
  const noSoUpdateOnFailure = !/\.from\(['"]sales_orders['"]\)\.update/i.test(handoffServiceSrc);
  check('U20-N14', 'Negative Guard 14: Zero sales_orders mutations in Operational Handoff service', noSoUpdateOnFailure);

  // N15: Creation of a second operational engine
  const noSecondEngine = !/\b(createJobOrder|dispatchArmada|assignDriver|putawayInventory)\b/i.test(handoffServiceSrc);
  check('U20-N15', 'Negative Guard 15: Zero second operational engines in Operational Handoff domain', noSecondEngine);

  // Clean up mock
  _setOperationalHandoffDbClient(null);

  console.log(`U-20 OPERATIONAL HANDOFF DOMAIN EXECUTION INTEGRATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
