/**
 * Sentralogis — ADR-091
 * lib/__tests__/adr091-copilot-domain-mutation-authority.test.ts
 *
 * Targeted tests for canonical Job Order domain mutation services:
 * - JobOrderAssignmentService
 * - DriverReplacementService
 * - JobOrderCancellationService
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import {
  JobOrderAssignmentService,
  DriverReplacementService,
  JobOrderCancellationService,
  JobOrderError,
  _setJobOrderDbClient,
  type JobOrderDbClient,
  type JobOrder,
  type AssignmentSlot,
} from '@/lib/domain/jo/job-order-domain-service';

// ============================================================================
// MOCK DATABASE
// ============================================================================

type Row = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: Row | null; error: DbError | null }
interface DbListResult { data: Row[] | null; error: DbError | null }

class MockJobOrderDb implements JobOrderDbClient {
  jobOrders: Row[] = [];
  woItems: Row[] = [];
  workOrders: Row[] = [];
  mdFleets: Row[] = [];
  mdDrivers: Row[] = [];
  jobTracking: Row[] = [];
  jobRoutes: Row[] = [];

  from(table: string) {
    const self = this;
    function rows(): Row[] {
      switch (table) {
        case 'job_orders': return self.jobOrders;
        case 'wo_items': return self.woItems;
        case 'work_orders': return self.workOrders;
        case 'md_fleets': return self.mdFleets;
        case 'md_drivers': return self.mdDrivers;
        case 'job_tracking': return self.jobTracking;
        case 'job_routes': return self.jobRoutes;
        default: return [];
      }
    }

    const selectChain: any = {
      _filters: [] as any[],
      eq(col: string, val: unknown) { selectChain._filters.push({ type: 'eq', col, val }); return selectChain; },
      in(col: string, vals: unknown[]) { selectChain._filters.push({ type: 'in', col, val: vals }); return selectChain; },
      order(col: string, opts: { ascending: boolean }) { return selectChain; },
      not(col: string, op: string, val: string) { selectChain._filters.push({ type: 'not', col, op, val }); return selectChain; },
      is(col: string, val: unknown | null) { selectChain._filters.push({ type: 'is', col, val }); return selectChain; },
      async single() {
        const filtered = self.applyFilters(rows(), selectChain._filters);
        if (filtered.length === 0) return { data: null, error: { message: 'No rows' } };
        return { data: filtered[0], error: null };
      },
      async maybeSingle() {
        const filtered = self.applyFilters(rows(), selectChain._filters);
        if (filtered.length === 0) return { data: null, error: null };
        return { data: filtered[0], error: null };
      },
      async select(_cols?: string) {
        const filtered = self.applyFilters(rows(), selectChain._filters);
        return { data: filtered, error: null };
      },
      then(resolve: (v: DbListResult) => void) {
        resolve(self.applyFilters(rows(), selectChain._filters) as any);
      },
    };

    const updateChain: any = {
      _filters: [] as any[],
      _payload: {} as Row,
      eq(col: string, val: unknown) { updateChain._filters.push({ type: 'eq', col, val }); return updateChain; },
      in(col: string, vals: unknown[]) { updateChain._filters.push({ type: 'in', col, val: vals }); return updateChain; },
      is(col: string, val: unknown | null) { updateChain._filters.push({ type: 'is', col, val }); return updateChain; },
      select(_cols?: string) {
        const filtered = self.applyFilters(rows(), updateChain._filters);
        for (const target of filtered) {
          Object.assign(target, updateChain._payload);
        }
        const ch: any = {
          async single() {
            if (filtered.length === 0) return { data: null, error: { message: 'No rows' } };
            return { data: filtered[0], error: null };
          },
          async maybeSingle() {
            if (filtered.length === 0) return { data: null, error: null };
            return { data: filtered[0], error: null };
          },
          then(resolve: (v: DbListResult) => void) {
            resolve({ data: filtered, error: null });
          },
        };
        return ch;
      },
      then(resolve: (v: DbListResult) => void) {
        const filtered = self.applyFilters(rows(), updateChain._filters);
        for (const target of filtered) {
          Object.assign(target, updateChain._payload);
        }
        resolve({ data: filtered, error: null });
      },
    };

    return {
      select() { return selectChain; },
      insert(row: Row | Row[]) {
        const newRows = Array.isArray(row) ? row : [row];
        const inserted = newRows.map((r, i) => ({
          ...r,
          id: r.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
        }));
        inserted.forEach((r) => rows().push(r));
        const ch: any = {
          async single() {
            if (inserted.length === 0) return { data: null, error: { message: 'No rows' } };
            return { data: inserted[0], error: null };
          },
          async maybeSingle() {
            if (inserted.length === 0) return { data: null, error: null };
            return { data: inserted[0], error: null };
          },
          then(resolve: (v: DbListResult) => void) {
            resolve({ data: inserted, error: null });
          },
        };
        return ch;
      },
      update(payload: Row) {
        updateChain._payload = payload;
        updateChain._filters = [];
        return updateChain;
      },
      delete() {
        const deleteChain: any = {
          _filters: [] as any[],
          eq(col: string, val: unknown) { deleteChain._filters.push({ type: 'eq', col, val }); return deleteChain; },
          in(col: string, vals: unknown[]) { deleteChain._filters.push({ type: 'in', col, val: vals }); return deleteChain; },
          is(col: string, val: unknown | null) { deleteChain._filters.push({ type: 'is', col, val }); return deleteChain; },
          not(col: string, op: string, val: string) { deleteChain._filters.push({ type: 'not', col, op, val }); return deleteChain; },
          then(resolve: (v: DbListResult) => void) {
            const filtered = self.applyFilters(rows(), deleteChain._filters);
            filtered.splice(0, filtered.length);
            resolve({ data: [], error: null });
          },
        };
        return deleteChain;
      },
    };
  }

  rpc(fn: string, args: Record<string, unknown>) {
    if (fn === 'replace_driver_atomic') {
      return Promise.resolve(this.mockReplaceDriverAtomic(args));
    }
    return Promise.resolve({ data: null, error: { message: 'RPC not mocked' } });
  }

  private mockReplaceDriverAtomic(args: Record<string, unknown>): {
    data: Array<Record<string, unknown>> | null;
    error: DbError | null;
  } {
    const p_tenant_id = String(args.p_tenant_id);
    const p_job_order_id = String(args.p_job_order_id);
    const p_new_driver_id = String(args.p_new_driver_id);
    const p_new_fleet_id = args.p_new_fleet_id ? String(args.p_new_fleet_id) : null;
    const p_new_transporter_id = args.p_new_transporter_id ? String(args.p_new_transporter_id) : null;
    const p_reason = args.p_reason ? String(args.p_reason) : null;

    const joIdx = this.jobOrders.findIndex((j) => j.id === p_job_order_id && j.tenant_id === p_tenant_id);
    if (joIdx === -1) {
      return {
        data: [{ p_success: false, p_error: 'Job order not found', p_code: 'NOT_FOUND', p_job_order: null }],
        error: null,
      };
    }

    const jo = this.jobOrders[joIdx];
    const oldFleetId = jo.fleet_id;
    const oldDriverId = jo.driver_id;

    jo.driver_id = p_new_driver_id;
    jo.driver_link_token = `mock-token-${Date.now()}`;
    jo.driver_response = 'accepted';
    jo.driver_response_at = new Date().toISOString();
    jo.accepted_at = new Date().toISOString();
    jo.status = 'ASSIGNED';
    jo.rejection_note = p_reason && p_reason.trim() !== ''
      ? `[REPLACE] ${p_reason}`
      : (jo.rejection_note || '[REPLACE] Driver replaced');
    jo.updated_at = new Date().toISOString();
    if (p_new_fleet_id) jo.fleet_id = p_new_fleet_id;
    if (p_new_transporter_id) jo.transporter_id = p_new_transporter_id;

    if (oldFleetId) {
      const fleet = this.mdFleets.find((f) => f.id === oldFleetId && f.status === 'on_duty');
      if (fleet) fleet.status = 'available';
    }
    if (oldDriverId) {
      const driver = this.mdDrivers.find((d) => d.id === oldDriverId && d.is_working === true);
      if (driver) {
        driver.status = 'available';
        driver.is_working = false;
      }
    }
    if (p_new_fleet_id) {
      const newFleet = this.mdFleets.find((f) => f.id === p_new_fleet_id);
      if (newFleet) newFleet.status = 'on_duty';
    }
    const newDriver = this.mdDrivers.find((d) => d.id === p_new_driver_id);
    if (newDriver) {
      newDriver.status = 'on_duty';
      newDriver.is_working = true;
    }

    this.jobTracking.push({
      job_order_id: p_job_order_id,
      status_update: 'OPS_REJECT_REASSIGN',
      notes: `Driver replaced. Reason: ${p_reason || 'N/A'}`,
      source: 'copilot',
      created_at: new Date().toISOString(),
    });

    return {
      data: [{ p_success: true, p_error: null, p_code: null, p_job_order: JSON.stringify(jo) }],
      error: null,
    };
  }

  private applyFilters(rows: Row[], filters: any[]): Row[] {
    let result = rows;
    for (const f of filters) {
      if (f.type === 'eq') result = result.filter((r: any) => r[f.col] === f.val);
      else if (f.type === 'in') {
        const vals = f.val as unknown[];
        result = result.filter((r: any) => vals.includes((r as any)[f.col]));
      }
      else if (f.type === 'is') result = result.filter((r: any) => r[f.col] === f.val);
      else if (f.type === 'not') {
        const vals = f.val as unknown[];
        result = result.filter((r: any) => !vals.includes((r as any)[f.col]));
      }
    }
    return result;
  }

  reset() {
    this.jobOrders = [];
    this.woItems = [];
    this.workOrders = [];
    this.mdFleets = [];
    this.mdDrivers = [];
    this.jobTracking = [];
    this.jobRoutes = [];
  }
}

// ============================================================================
// FIXTURES
// ============================================================================

const TENANT = 'tenant-1';
const USER = 'user-1';
let idCounter = 0;

function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: USER,
    tenantId: TENANT,
    membershipId: 'mem-1',
    role: 'sbu_ops_tr',
    isTenantOwner: false,
    permissions: ['job_order:assign', 'job_order:update', 'job_order:read'],
    sbuScope: 'trucking',
    ...over,
  };
}

function seedJo(over: Partial<Row> = {}): Row {
  return {
    id: over.id || nextId('jo'),
    tenant_id: over.tenant_id || TENANT,
    wo_item_id: over.wo_item_id || 'wi-1',
    jo_number: over.jo_number || `JO-${nextId('jo')}`,
    status: over.status || 'ASSIGNED',
    transporter_id: over.transporter_id || 'trans-1',
    fleet_id: over.fleet_id || 'fleet-1',
    driver_id: over.driver_id || 'driver-1',
    driver_phone: over.driver_phone || '+628123456',
    driver_response: over.driver_response || 'accepted',
    accepted_at: over.accepted_at || '2026-09-08T01:00:00.000Z',
    rejection_note: over.rejection_note || null,
    notes: over.notes || null,
    assigned_at: over.assigned_at || '2026-09-08T01:00:00.000Z',
    dispatch_ready: over.dispatch_ready ?? true,
    dispatch_ready_at: over.dispatch_ready_at || '2026-09-08T01:00:00.000Z',
    purchase_price: over.purchase_price ?? 100000,
    base_price: over.base_price ?? 150000,
    driver_share_percentage: over.driver_share_percentage ?? 70,
    advance_amount: over.advance_amount ?? 50000,
    estimated_margin: over.estimated_margin ?? 50000,
    total_stops: over.total_stops ?? 2,
    container_number: over.container_number || null,
    assignment_documents: over.assignment_documents || [],
    sbu_metadata: over.sbu_metadata || {},
    created_at: over.created_at || '2026-09-08T01:00:00.000Z',
    updated_at: over.updated_at || '2026-09-08T01:00:00.000Z',
  };
}

function seedFleet(over: Partial<Row> = {}): Row {
  return {
    id: over.id || nextId('fleet'),
    tenant_id: over.tenant_id || TENANT,
    plate_number: over.plate_number || `B${nextId('plate')}`,
    status: over.status || 'on_duty',
    ...over,
  };
}

function seedDriver(over: Partial<Row> = {}): Row {
  return {
    id: over.id || nextId('driver'),
    tenant_id: over.tenant_id || TENANT,
    name: over.name || `Driver ${nextId('drv')}`,
    status: over.status || 'on_duty',
    is_working: over.is_working ?? true,
    ...over,
  };
}

// ============================================================================
// SUITE
// ============================================================================

export async function runAdr091Suite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  async function check(testId: string, description: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ testId, description, pass: true });
      passed++;
    } catch (e: any) {
      console.error(`FAIL [${testId}] ${description}: ${e.message}`);
      results.push({ testId, description, pass: false, error: e.message || String(e) });
      failed++;
    }
  }

  const db = new MockJobOrderDb();
  _setJobOrderDbClient(db as unknown as JobOrderDbClient);
  const assignmentService = new JobOrderAssignmentService();
  const replacementService = new DriverReplacementService();
  const cancellationService = new JobOrderCancellationService();

  // =========================================================================
  // JobOrderAssignmentService
  // =========================================================================

  await check('ADR091-A1', 'assignDriver rejects missing permission', async () => {
    const ctx = makeCtx({ permissions: ['job_order:read'] });
    let threw = false;
    try {
      await assignmentService.assignDriver(ctx, { jobOrderId: 'jo-1', driverId: 'driver-2' });
    } catch (e: any) {
      threw = true;
    }
    if (!threw) throw new Error('Expected permission error to be thrown');
  });

  await check('ADR091-A2', 'assignDriver rejects non-assignable status', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId, status: 'COMPLETED' }));
    const ctx = makeCtx();
    const result = await assignmentService.assignDriver(ctx, { jobOrderId: joId, driverId: 'driver-2' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'INVALID_STATE') throw new Error(`Expected INVALID_STATE, got ${result.code}`);
  });

  await check('ADR091-A3', 'assignDriver updates JO and records tracking for PENDING JO', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
    const ctx = makeCtx();
    const result = await assignmentService.assignDriver(ctx, { jobOrderId: joId, driverId: 'driver-2', fleetId: 'fleet-2', transporterId: 'trans-2' });
    if (result.success !== true) throw new Error(`Expected success, got ${result.error}`);
    if (result.jobOrder?.status !== 'ASSIGNED') throw new Error('Expected ASSIGNED');
    if (result.jobOrder?.driverId !== 'driver-2') throw new Error('Expected driver-2');
    if (result.jobOrder?.fleetId !== 'fleet-2') throw new Error('Expected fleet-2');
    if (result.jobOrder?.transporterId !== 'trans-2') throw new Error('Expected trans-2');
    const tracking = db.jobTracking.filter((t) => t.status_update === 'ASSIGNED');
    if (tracking.length !== 1) throw new Error('Expected 1 tracking record');
  });

  await check('ADR091-A4', 'assignDriver rejects cross-tenant JO', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId, tenant_id: 'tenant-other' }));
    const ctx = makeCtx();
    const result = await assignmentService.assignDriver(ctx, { jobOrderId: joId, driverId: 'driver-2' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'NOT_FOUND') throw new Error(`Expected NOT_FOUND, got ${result.code}`);
  });

  // =========================================================================
  // DriverReplacementService
  // =========================================================================

  await check('ADR091-B1', 'replaceDriver rejects missing permission', async () => {
    const ctx = makeCtx({ permissions: ['job_order:read'] });
    let threw = false;
    try {
      await replacementService.replaceDriver(ctx, { jobOrderId: 'jo-1', newDriverId: 'driver-2' });
    } catch (e: any) {
      threw = true;
    }
    if (!threw) throw new Error('Expected permission error to be thrown');
  });

  await check('ADR091-B2', 'replaceDriver rejects non-ASSIGNED status', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId, status: 'IN_PROGRESS' }));
    const ctx = makeCtx();
    const result = await replacementService.replaceDriver(ctx, { jobOrderId: joId, newDriverId: 'driver-2' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'INVALID_STATE') throw new Error(`Expected INVALID_STATE, got ${result.code}`);
  });

  await check('ADR091-B3', 'replaceDriver rejects same driver/fleet/transporter', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId }));
    db.mdFleets.push(seedFleet({ id: 'fleet-1' }));
    db.mdDrivers.push(seedDriver({ id: 'driver-1' }));
    const ctx = makeCtx();
    const result = await replacementService.replaceDriver(ctx, { jobOrderId: joId, newDriverId: 'driver-1', newFleetId: 'fleet-1', newTransporterId: 'trans-1' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'SAME_DRIVER') throw new Error(`Expected SAME_DRIVER, got ${result.code}`);
  });

  await check('ADR091-B4', 'replaceDriver atomically updates JO, tracking, and assets', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId }));
    db.mdFleets.push(seedFleet({ id: 'fleet-1' }));
    db.mdDrivers.push(seedDriver({ id: 'driver-1' }));
    db.mdFleets.push({ id: 'fleet-2', tenant_id: TENANT, plate_number: `B${nextId('plate')}`, status: 'available' });
    db.mdDrivers.push({ id: 'driver-2', tenant_id: TENANT, name: `Driver ${nextId('drv')}`, status: 'available', is_working: false });

    const ctx = makeCtx();
    const result = await replacementService.replaceDriver(ctx, { jobOrderId: joId, newDriverId: 'driver-2', newFleetId: 'fleet-2', newTransporterId: 'trans-2', reason: 'ops reassign' });
    console.log('replace result:', result.success, result.error, result.code);
    console.log('fleets after replace:', JSON.stringify(db.mdFleets));
    if (result.success !== true) throw new Error(`Expected success, got ${result.error}`);
    if (result.jobOrder?.status !== 'ASSIGNED') throw new Error('Expected ASSIGNED');
    if (result.jobOrder?.driverId !== 'driver-2') throw new Error('Expected driver-2');
    if (result.jobOrder?.fleetId !== 'fleet-2') throw new Error('Expected fleet-2');
    if (result.jobOrder?.transporterId !== 'trans-2') throw new Error('Expected trans-2');
    if (!result.jobOrder?.rejectionNote?.includes('[REPLACE]')) throw new Error('Expected [REPLACE] in note');

    const tracking = db.jobTracking.filter((t) => t.status_update === 'OPS_REJECT_REASSIGN');
    if (tracking.length !== 1) throw new Error('Expected 1 tracking record');

    const oldFleet = db.mdFleets.find((f) => f.id === 'fleet-1');
    const newFleet = db.mdFleets.find((f) => f.id === 'fleet-2');
    const oldDriver = db.mdDrivers.find((d) => d.id === 'driver-1');
    const newDriver = db.mdDrivers.find((d) => d.id === 'driver-2');

    if (oldFleet?.status !== 'available') throw new Error('Old fleet should be available');
    if (newFleet?.status !== 'on_duty') throw new Error('New fleet should be on_duty');
    if (oldDriver?.status !== 'available') throw new Error('Old driver should be available');
    if (newDriver?.status !== 'on_duty') throw new Error('New driver should be on_duty');
  });

  await check('ADR091-B5', 'replaceDriver rejects cross-tenant JO', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders = [seedJo({ id: joId, tenant_id: 'tenant-other' })];
    const ctx = makeCtx();
    const result = await replacementService.replaceDriver(ctx, { jobOrderId: joId, newDriverId: 'driver-2' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'NOT_FOUND') throw new Error(`Expected NOT_FOUND, got ${result.code}`);
  });

  // =========================================================================
  // JobOrderCancellationService
  // =========================================================================

  await check('ADR091-C1', 'cancelJobOrder rejects missing permission', async () => {
    const ctx = makeCtx({ permissions: ['job_order:read'] });
    let threw = false;
    try {
      await cancellationService.cancelJobOrder(ctx, { jobOrderId: 'jo-1', reason: 'ops cancel' });
    } catch (e: any) {
      threw = true;
    }
    if (!threw) throw new Error('Expected permission error to be thrown');
  });

  await check('ADR091-C2', 'cancelJobOrder rejects missing reason', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId }));
    const ctx = makeCtx();
    const result = await cancellationService.cancelJobOrder(ctx, { jobOrderId: joId, reason: '' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'MISSING_REASON') throw new Error(`Expected MISSING_REASON, got ${result.code}`);
  });

  await check('ADR091-C3', 'cancelJobOrder rejects terminal status', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders = [seedJo({ id: joId, status: 'COMPLETED' })];
    const ctx = makeCtx();
    const result = await cancellationService.cancelJobOrder(ctx, { jobOrderId: joId, reason: 'ops cancel' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'INVALID_STATE') throw new Error(`Expected INVALID_STATE, got ${result.code}`);
  });

  await check('ADR091-C4', 'cancelJobOrder transitions to CANCELLED and releases assets', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders.push(seedJo({ id: joId }));
    db.mdFleets.push(seedFleet({ id: 'fleet-1' }));
    db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

    const ctx = makeCtx();
    const result = await cancellationService.cancelJobOrder(ctx, { jobOrderId: joId, reason: 'ops cancel' });
    if (result.success !== true) throw new Error(`Expected success, got ${result.error}`);
    if (result.jobOrder?.status !== 'CANCELLED') throw new Error('Expected CANCELLED');
    if (result.jobOrder?.rejectionNote !== '[CANCELLED] ops cancel') throw new Error('Expected [CANCELLED] ops cancel');

    const tracking = db.jobTracking.filter((t) => t.status_update === 'CANCELLED');
    if (tracking.length !== 1) throw new Error('Expected 1 tracking record');

    const fleet = db.mdFleets.find((f) => f.id === 'fleet-1');
    const driver = db.mdDrivers.find((d) => d.id === 'driver-1');
    if (fleet?.status !== 'available') throw new Error('Fleet should be available');
    if (driver?.status !== 'available') throw new Error('Driver should be available');
  });

  await check('ADR091-C5', 'cancelJobOrder rejects cross-tenant JO', async () => {
    db.reset();
    const joId = nextId('jo');
    db.jobOrders = [seedJo({ id: joId, tenant_id: 'tenant-other' })];
    const ctx = makeCtx();
    const result = await cancellationService.cancelJobOrder(ctx, { jobOrderId: joId, reason: 'ops cancel' });
    if (result.success !== false) throw new Error('Expected failure');
    if (result.code !== 'NOT_FOUND') throw new Error(`Expected NOT_FOUND, got ${result.code}`);
  });

  // =========================================================================
  // Tenant isolation contract
  // =========================================================================

  await check('ADR091-D1', 'all mutations filter by tenant_id', async () => {
    db.reset();
    const joIdOther = nextId('jo');
    const joIdSame = nextId('jo');
    db.jobOrders.push(seedJo({ id: joIdOther, tenant_id: 'tenant-other', status: 'PENDING' }));
    db.jobOrders.push(seedJo({ id: joIdSame, tenant_id: TENANT, status: 'PENDING' }));
    const ctx = makeCtx();
    const assignResult = await assignmentService.assignDriver(ctx, { jobOrderId: joIdSame, driverId: 'driver-2' });
    if (assignResult.success !== true) throw new Error(`Expected success, got ${assignResult.error}`);
    const untouched = db.jobOrders.find((j) => j.id === joIdOther);
    if (untouched?.status !== 'PENDING') throw new Error('Cross-tenant row should be untouched');
  });

  _setJobOrderDbClient(null);

  console.log(`ADR-091: ${passed}/${passed + failed} PASS${failed > 0 ? ` (${failed} FAIL)` : ''}`);
  return { passed, failed, total: passed + failed };
}
