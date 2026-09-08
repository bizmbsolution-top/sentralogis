/**
 * Sentralogis — Phase 4B / U-18
 * lib/__tests__/u18-operational-handoff-foundation.test.ts
 *
 * OPERATIONAL HANDOFF FOUNDATION TEST SUITE
 *
 * Comprehensive static, architectural, and behavioral verification for the
 * canonical Operational Handoff Foundation (ADR-051 .. ADR-056).
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
} from '@/lib/operational-handoff/types';
import {
  getOperationalHandoffAdapter,
  ForwardingHandoffAdapter,
  CustomsHandoffAdapter,
  TruckingHandoffAdapter,
  WarehouseHandoffAdapter,
} from '@/lib/operational-handoff/adapters';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');

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

// ============================================================================
// MOCK DATABASE CLIENT
// ============================================================================

class OperationalHandoffMockDb implements OperationalHandoffDbClient {
  public handoffs: Record<string, unknown>[] = [];
  public fulfillments: Record<string, unknown>[] = [];
  public allocations: Record<string, unknown>[] = [];
  public nextInsertUniqueViolation = false;
  private seqCounter = 1;

  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: null | { message: string; code?: string } }> {
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
    let orderBy: { col: string; ascending: boolean } | null = null;

    const queryChain: any = {
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return queryChain;
      },
      in(col: string, vals: unknown[]) {
        return queryChain;
      },
      order(col: string, opts: { ascending: boolean }) {
        orderBy = { col, ...opts };
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
                  return { data: null, error: { message: 'unique constraint violation', code: '23505' } };
                }
                const inserted = {
                  id: row.id || `oh-${Date.now()}-${Math.random()}`,
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
        return {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return this;
          },
          async select(_cols?: string) {
            const list = self.getTableData(table);
            const updated: Record<string, unknown>[] = [];
            for (let i = 0; i < list.length; i++) {
              if (filters.every((f) => list[i][f.col] === f.val)) {
                list[i] = { ...list[i], ...patch, updated_at: new Date().toISOString() };
                updated.push({ ...list[i] });
              }
            }
            return { data: updated, error: null };
          },
        };
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
    return [];
  }
}

export async function runU18OperationalHandoffFoundationSuite(): Promise<{
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

  const mig021Path = path.join(MIG_DIR, '20260828_021_operational_handoff_foundation.sql');
  const mig021 = fs.existsSync(mig021Path) ? fs.readFileSync(mig021Path, 'utf8') : '';
  const handoffServiceSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'service.ts'), 'utf8')
    : '';
  const handoffTypesSrc = fs.existsSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'operational-handoff', 'types.ts'), 'utf8')
    : '';

  /* ------------------------------------------------------------------ */
  /*  SECTION A: Static / Forensic Schema & Identity Gates              */
  /* ------------------------------------------------------------------ */

  check('U18-01', 'Migration 021 exists and creates operational_handoffs table', /CREATE TABLE IF NOT EXISTS public\.operational_handoffs/i.test(mig021));
  check('U18-02', 'operational_handoffs has UUID PK with gen_random_uuid()', /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(mig021));
  check('U18-03', 'operational_handoffs has handoff_number TEXT NOT NULL', /handoff_number\s+TEXT\s+NOT\s+NULL/i.test(mig021));
  check('U18-04', 'Migration creates seq_operational_handoff sequence', /CREATE SEQUENCE IF NOT EXISTS seq_operational_handoff/i.test(mig021));
  check('U18-05', 'Migration defines next_operational_handoff_number RPC function', /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_operational_handoff_number/i.test(mig021));
  check('U18-06', 'operational_handoffs has UNIQUE (tenant_id, handoff_number) constraint', /CONSTRAINT uq_operational_handoff_number\s+UNIQUE\s*\(tenant_id,\s*handoff_number\)/i.test(mig021));
  check('U18-07', 'operational_handoffs has UNIQUE (tenant_id, idempotency_key) constraint', /CONSTRAINT uq_operational_handoff_idempotency\s+UNIQUE\s*\(tenant_id,\s*idempotency_key\)/i.test(mig021));
  check('U18-08', 'operational_handoffs has fulfillment_id FK referencing public.fulfillments(id)', /fulfillment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.fulfillments\(id\)/i.test(mig021));
  check('U18-09', 'operational_handoffs has fulfillment_allocation_id FK referencing public.fulfillment_allocations(id)', /fulfillment_allocation_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.fulfillment_allocations\(id\)/i.test(mig021));
  check('U18-10', 'Migration defines com_operational_handoff_status enum with all 8 canonical states',
    /CREATE TYPE com_operational_handoff_status AS ENUM\s*\(\s*'ISSUED',\s*'ACKNOWLEDGED',\s*'ACCEPTED',\s*'EXECUTING',\s*'FULFILLED',\s*'FAILED',\s*'REJECTED',\s*'CANCELLED'\s*\)/i.test(mig021));
  check('U18-11', 'operational_handoffs has loose polymorphic pointer assigned_domain_reference JSONB', /assigned_domain_reference\s+JSONB/i.test(mig021));
  check('U18-12', 'operational_handoffs has RLS enabled with get_my_tenant_id() policy', /CREATE POLICY operational_handoffs_isolation ON public\.operational_handoffs[\s\S]*?get_my_tenant_id\(\)/i.test(mig021));

  /* ------------------------------------------------------------------ */
  /*  SECTION B: Static Service & Security Gates                        */
  /* ------------------------------------------------------------------ */

  check('U18-13', 'Service derives tenant from context.tenantId (no x-tenant-id trust)', !/x-tenant-id/i.test(handoffServiceSrc) && handoffServiceSrc.includes('context.tenantId'));
  check('U18-14', 'Service enforces commercial:manage on mutations and commercial:read on queries',
    handoffServiceSrc.includes("assertPermission(context, 'commercial:manage')") &&
    handoffServiceSrc.includes("assertPermission(context, 'commercial:read')"));
  check('U18-15', 'Types file defines OPERATIONAL_HANDOFF_TRANSITIONS as closed state machine', /const OPERATIONAL_HANDOFF_TRANSITIONS/i.test(handoffTypesSrc));

  /* ------------------------------------------------------------------ */
  /*  SECTION C: Behavioral Service Tests (Mock DB)                     */
  /* ------------------------------------------------------------------ */

  const mockDb = new OperationalHandoffMockDb();
  _setOperationalHandoffDbClient(mockDb);

  const testFlId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const testAllocId = 'aaaaaaaa-1111-2222-3333-444444444444';

  mockDb.fulfillments.push({
    id: testFlId,
    tenant_id: TENANT_A,
    status: 'ACTIVE',
  });

  mockDb.allocations.push({
    id: testAllocId,
    tenant_id: TENANT_A,
    fulfillment_id: testFlId,
    capability_type: 'FORWARDING',
  });

  // U18-16: Allocate handoff number RPC
  await checkAsync('U18-16', 'allocateOperationalHandoffNumber generates OH-YYYY-MM-NNNN format', async () => {
    const num = await allocateOperationalHandoffNumber(makeContext());
    return /^OH-\d{4}-\d{2}-\d{4}$/.test(num);
  });

  // U18-17: Create handoff succeeds with created=true
  let createdHandoffId = '';
  await checkAsync('U18-17', 'createOperationalHandoff creates handoff with ISSUED status and returns created=true', async () => {
    const res = await createOperationalHandoff(makeContext(), {
      fulfillmentId: testFlId,
      fulfillmentAllocationId: testAllocId,
      targetDomain: 'FORWARDING',
      idempotencyKey: 'idemp-001',
      requestPayload: { shipmentId: 'shp-123', shipmentNumber: 'SHP-2026-08-0001' },
    });
    createdHandoffId = res.handoff.id;
    return res.created && res.handoff.status === 'ISSUED' && res.handoff.targetDomain === 'FORWARDING';
  });

  // U18-18: Duplicate idempotencyKey returns existing with created=false
  await checkAsync('U18-18', 'createOperationalHandoff returns existing handoff with created=false on duplicate idempotency key', async () => {
    const res = await createOperationalHandoff(makeContext(), {
      fulfillmentId: testFlId,
      fulfillmentAllocationId: testAllocId,
      targetDomain: 'FORWARDING',
      idempotencyKey: 'idemp-001',
    });
    return !res.created && res.handoff.id === createdHandoffId;
  });

  // U18-19: Cross-tenant fulfillment rejected
  await checkAsync('U18-19', 'createOperationalHandoff rejects cross-tenant fulfillment with FULFILLMENT_NOT_FOUND', async () => {
    try {
      await createOperationalHandoff(makeContext(TENANT_B), {
        fulfillmentId: testFlId,
        fulfillmentAllocationId: testAllocId,
        targetDomain: 'FORWARDING',
      });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'FULFILLMENT_NOT_FOUND';
    }
  });

  // U18-20: Mismatching capability and target domain rejected
  await checkAsync('U18-20', 'createOperationalHandoff rejects target domain mismatch with allocation capability', async () => {
    try {
      await createOperationalHandoff(makeContext(), {
        fulfillmentId: testFlId,
        fulfillmentAllocationId: testAllocId,
        targetDomain: 'TRUCKING', // Allocation is FORWARDING
      });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'INVALID_TARGET_DOMAIN';
    }
  });

  // U18-21: Lifecycle transitions (ISSUED -> ACKNOWLEDGED -> ACCEPTED -> EXECUTING -> FULFILLED)
  await checkAsync('U18-21', 'performOperationalHandoffAction supports full lifecycle transitions', async () => {
    const ctx = makeContext();
    const ack = await performOperationalHandoffAction(ctx, createdHandoffId, { action: 'acknowledge' });
    if (ack.status !== 'ACKNOWLEDGED' || !ack.acknowledgedAt) return false;

    const accept = await performOperationalHandoffAction(ctx, createdHandoffId, { action: 'accept' });
    if (accept.status !== 'ACCEPTED' || !accept.acceptedAt || !accept.assignedDomainReference) return false;

    const exec = await performOperationalHandoffAction(ctx, createdHandoffId, { action: 'startExecuting' });
    if (exec.status !== 'EXECUTING' || !exec.executingAt) return false;

    const fulfilled = await performOperationalHandoffAction(ctx, createdHandoffId, { action: 'fulfill' });
    return fulfilled.status === 'FULFILLED' && Boolean(fulfilled.fulfilledAt);
  });

  // U18-22: Invalid transition rejected
  await checkAsync('U18-22', 'performOperationalHandoffAction rejects invalid transition from terminal state', async () => {
    try {
      await performOperationalHandoffAction(makeContext(), createdHandoffId, { action: 'acknowledge' });
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'INVALID_STATUS_TRANSITION';
    }
  });

  // U18-23: Lookup by ID
  await checkAsync('U18-23', 'findOperationalHandoffById returns handoff for correct tenant', async () => {
    const h = await findOperationalHandoffById(makeContext(), createdHandoffId);
    return h.id === createdHandoffId && h.tenantId === TENANT_A;
  });

  // U18-24: Cross-tenant lookup rejected
  await checkAsync('U18-24', 'findOperationalHandoffById rejects cross-tenant lookup with HANDOFF_NOT_FOUND', async () => {
    try {
      await findOperationalHandoffById(makeContext(TENANT_B), createdHandoffId);
      return false;
    } catch (err: any) {
      return err instanceof OperationalHandoffError && err.code === 'HANDOFF_NOT_FOUND';
    }
  });

  /* ------------------------------------------------------------------ */
  /*  SECTION D: Domain Adapters Verification                           */
  /* ------------------------------------------------------------------ */

  const fwdAdapter = getOperationalHandoffAdapter('FORWARDING');
  check('U18-25', 'ForwardingHandoffAdapter handles FORWARDING and creates SHIPMENT reference',
    fwdAdapter instanceof ForwardingHandoffAdapter &&
    fwdAdapter.canHandle('FORWARDING') &&
    fwdAdapter.createDomainReference({ id: 'h1', targetDomain: 'FORWARDING', handoffNumber: 'OH-1', requestPayload: {} } as any).referenceType === 'SHIPMENT');

  const cusAdapter = getOperationalHandoffAdapter('CUSTOMS');
  check('U18-26', 'CustomsHandoffAdapter handles CUSTOMS and creates DECLARATION reference',
    cusAdapter instanceof CustomsHandoffAdapter &&
    cusAdapter.canHandle('CUSTOMS') &&
    cusAdapter.createDomainReference({ id: 'h2', targetDomain: 'CUSTOMS', handoffNumber: 'OH-2', requestPayload: {} } as any).referenceType === 'DECLARATION');

  const trkAdapter = getOperationalHandoffAdapter('TRUCKING');
  check('U18-27', 'TruckingHandoffAdapter handles TRUCKING and creates SERVICE_REQUEST reference',
    trkAdapter instanceof TruckingHandoffAdapter &&
    trkAdapter.canHandle('TRUCKING') &&
    trkAdapter.createDomainReference({ id: 'h3', targetDomain: 'TRUCKING', handoffNumber: 'OH-3', requestPayload: {} } as any).referenceType === 'SERVICE_REQUEST');

  const whAdapter = getOperationalHandoffAdapter('WAREHOUSE');
  check('U18-28', 'WarehouseHandoffAdapter handles WAREHOUSE and creates WAREHOUSE_ORDER reference',
    whAdapter instanceof WarehouseHandoffAdapter &&
    whAdapter.canHandle('WAREHOUSE') &&
    whAdapter.createDomainReference({ id: 'h4', targetDomain: 'WAREHOUSE', handoffNumber: 'OH-4', requestPayload: {} } as any).referenceType === 'WAREHOUSE_ORDER');

  /* ------------------------------------------------------------------ */
  /*  SECTION E: Negative Architecture Guards                           */
  /* ------------------------------------------------------------------ */

  // Negative 1: Zero direct JO mutations in handoff service
  const zeroJoMutation = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(handoffServiceSrc);
  check('U18-29', 'Negative Guard: Operational Handoff domain does NOT directly mutate job_orders', zeroJoMutation);

  // Negative 2: Zero driver/vehicle/GPS fields in operational_handoffs table
  const zeroDriverGpsColumns = !/\b(md_drivers|driver_id|vehicle_plate|gps_coordinates|telemetry)\b/i.test(mig021);
  check('U18-30', 'Negative Guard: operational_handoffs schema contains zero driver, vehicle, or GPS columns', zeroDriverGpsColumns);

  // Negative 3: Zero warehouse inventory fields in operational_handoffs table
  const zeroInventoryColumns = !/\b(wh_inventory|bin_location|rack_id|pallet_id)\b/i.test(mig021);
  check('U18-31', 'Negative Guard: operational_handoffs schema contains zero inventory bin/rack columns', zeroInventoryColumns);

  // Clean up
  _setOperationalHandoffDbClient(null);

  console.log(`U-18 OPERATIONAL HANDOFF FOUNDATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
