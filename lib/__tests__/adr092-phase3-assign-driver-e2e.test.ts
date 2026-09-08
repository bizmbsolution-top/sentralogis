/**
 * Sentralogis — ADR-092 Phase 3 ASSIGN_DRIVER Integration/E2E Acceptance
 * lib/__tests__/adr092-phase3-assign-driver-e2e.test.ts
 *
 * Behavioral Integration/E2E validation for ASSIGN_DRIVER controlled rollout.
 * Exercises the full execution boundary:
 *   EXECUTE → ProposalAuthorityService → routeToDomainService → JobOrderAssignmentService → canonical mutation
 *
 * Run via: npx tsx scripts/run-phase3-tests.ts
 */

import { ExecutionService } from '@/lib/copilot/execute/execution-service';
import { ProposalAuthorityService } from '@/lib/copilot/propose/proposal-authority-service';
import {
  JobOrderAssignmentService,
  _setJobOrderDbClient,
  type JobOrderDbClient,
} from '@/lib/domain/jo/job-order-domain-service';
import type { IdentityContext } from '@/lib/application/identity/types';
import { isCopilotActionEnabled, COPILOT_FEATURE_FLAGS } from '@/lib/copilot/feature-flags';

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

    const deleteChain: any = {
      _filters: [] as any[],
      eq(col: string, val: unknown) { deleteChain._filters.push({ type: 'eq', col, val }); return deleteChain; },
      in(col: string, vals: unknown[]) { deleteChain._filters.push({ type: 'in', col, val: vals }); return deleteChain; },
      is(col: string, val: unknown | null) { deleteChain._filters.push({ type: 'is', col, val }); return deleteChain; },
      then(resolve: (v: DbListResult) => void) {
        const filtered = self.applyFilters(rows(), deleteChain._filters);
        filtered.forEach((r) => { const idx = rows().indexOf(r); if (idx >= 0) rows().splice(idx, 1); });
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
      delete() { return deleteChain; },
    };
  }

  rpc(fn: string, args: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: { message: 'RPC not mocked' } });
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
    status: over.status || 'PENDING',
    transporter_id: over.transporter_id || 'trans-1',
    fleet_id: over.fleet_id || 'fleet-1',
    driver_id: over.driver_id || 'driver-1',
    driver_phone: over.driver_phone || '+628123456',
    driver_response: over.driver_response || 'pending',
    accepted_at: over.accepted_at || null,
    rejection_note: over.rejection_note || null,
    notes: over.notes || null,
    assigned_at: over.assigned_at || null,
    dispatch_ready: over.dispatch_ready ?? false,
    dispatch_ready_at: over.dispatch_ready_at || null,
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

function buildProposal(over: any = {}): any {
  return {
    id: 'proposal-id-1',
    tenant_id: TENANT,
    proposal_number: 'CP-2026-09-0001',
    correlation_id: 'corr-1',
    idempotency_key: 'idempotency-1',
    intent: 'ASSIGN_DRIVER',
    entities: [
      { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
      { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
    ],
    required_permissions: ['job_order:assign'],
    risk_level: 'MEDIUM',
    human_confirmation_required: true,
    confirmation_state: 'CONFIRMED',
    confirmation_actor_id: USER,
    confirmation_at: new Date().toISOString(),
    confirmation_note: null,
    explainability: { summary: 'test', details: 'test' },
    policy_check: { status: 'ALLOWED' },
    proposal_payload: {},
    lifecycle_state: 'CONFIRMED',
    expiry_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: USER,
    updated_by: USER,
    ...over,
  };
}

function buildExecutionRequest(proposalId: string, over: any = {}): any {
  return {
    proposalId,
    proposal: {
      proposalId,
      intent: 'ASSIGN_DRIVER',
      entities: [
        { entityType: 'JobOrder', entityId: 'jo-1', displayName: 'JO-001' },
        { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' },
      ],
      requiredPermissions: ['job_order:assign'],
      riskLevel: 'MEDIUM',
      confirmationMessage: 'Confirm: execute assign_driver?',
      ...over,
    },
    confirmation: {
      confirmed: true,
      confirmedBy: USER,
      confirmedAt: new Date().toISOString(),
      confirmationNote: 'Operator confirmed via UI',
      ...over,
    },
  };
}

// ============================================================================
// SUITE
// ============================================================================

export async function runAdr092Phase3Suite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
  }

  // Save original static methods
  const originalGetProposal = ProposalAuthorityService.getProposal.bind(ProposalAuthorityService);
  const originalClaim = ProposalAuthorityService.claimProposalForExecution.bind(ProposalAuthorityService);
  const originalRecord = ProposalAuthorityService.recordExecutionResult.bind(ProposalAuthorityService);

  function restoreProposalMocks() {
    ProposalAuthorityService.getProposal = originalGetProposal;
    ProposalAuthorityService.claimProposalForExecution = originalClaim;
    ProposalAuthorityService.recordExecutionResult = originalRecord;
  }

  const db = new MockJobOrderDb();
  _setJobOrderDbClient(db as unknown as JobOrderDbClient);

  try {
    // =====================================================================
    // T1 — Happy Path
    // =====================================================================
    try {
      const originalFlag = process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);
      const tracking = db.jobTracking.filter((t) => t.status_update === 'ASSIGNED');

      addResult(
        'P3-T1',
        'Happy path: ASSIGN_DRIVER succeeds through EXECUTE boundary',
        result.status === 'SUCCESS'
          && jo?.status === 'ASSIGNED'
          && tracking.length === 1
          && tracking[0].job_order_id === joId,
        `status=${result.status}, joStatus=${jo?.status}, trackingCount=${tracking.length}`,
      );

      if (originalFlag) {
        process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = originalFlag;
      } else {
        delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
      }
    } catch (e: any) {
      addResult('P3-T1', 'Happy path: ASSIGN_DRIVER succeeds through EXECUTE boundary', false, e.message);
    }

    // =====================================================================
    // T2 — Feature Flag OFF
    // =====================================================================
    try {
      const originalFlag = process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);
      const tracking = db.jobTracking.filter((t) => t.status_update === 'ASSIGNED');

      addResult(
        'P3-T2',
        'Feature flag OFF: ASSIGN_DRIVER does not mutate Job Order',
        result.status === 'FAILED'
          && jo?.status === 'PENDING'
          && tracking.length === 0,
        `status=${result.status}, joStatus=${jo?.status}, trackingCount=${tracking.length}`,
      );

      if (originalFlag) {
        process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = originalFlag;
      }
    } catch (e: any) {
      addResult('P3-T2', 'Feature flag OFF: ASSIGN_DRIVER does not mutate Job Order', false, e.message);
    }

    // =====================================================================
    // T3 — Copilot Authorization Failure
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));

      ProposalAuthorityService.getProposal = async () => {
        throw new Error('Proposal not found or access denied.');
      };
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...buildProposal(), outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-UNKNOWN');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);

      addResult(
        'P3-T3',
        'Copilot authorization failure: execution rejected, no mutation',
        result.status === 'DENIED' && jo?.status === 'PENDING',
        `status=${result.status}, joStatus=${jo?.status}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T3', 'Copilot authorization failure: execution rejected, no mutation', false, e.message);
    }

    // =====================================================================
    // T4 — Domain Authorization Failure
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx({ permissions: ['commercial:read'] });
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);

      addResult(
        'P3-T4',
        'Domain authorization failure: missing job_order:assign rejected',
        result.status === 'DENIED' && jo?.status === 'PENDING',
        `status=${result.status}, joStatus=${jo?.status}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T4', 'Domain authorization failure: missing job_order:assign rejected', false, e.message);
    }

    // =====================================================================
    // T5 — Tenant Isolation
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, tenant_id: 'tenant-other', status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ tenant_id: 'tenant-other', entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx({ tenantId: 'tenant-attacker', permissions: ['job_order:assign'] });
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);

      addResult(
        'P3-T5',
        'Tenant isolation: cross-tenant Job Order rejected',
        result.status === 'FAILED' || result.status === 'DENIED',
        `status=${result.status}, joStatus=${jo?.status}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T5', 'Tenant isolation: cross-tenant Job Order rejected', false, e.message);
    }

    // =====================================================================
    // T6 — Invalid Assignment (non-assignable status)
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'COMPLETED' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);

      addResult(
        'P3-T6',
        'Invalid assignment: COMPLETED JO rejected, no false SUCCESS',
        result.status === 'FAILED' && jo?.status === 'COMPLETED',
        `status=${result.status}, joStatus=${jo?.status}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T6', 'Invalid assignment: COMPLETED JO rejected, no false SUCCESS', false, e.message);
    }

    // =====================================================================
    // T7 — Repeated Execution / Idempotency
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      let callCount = 0;
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => {
        callCount++;
        if (callCount === 1) {
          return { ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any;
        }
        return { ...proposal, outcome: 'ALREADY_EXECUTED', lifecycle_state: 'EXECUTED', proposal_payload: { executionResult: { executionId: 'exec-existing', status: 'SUCCESS', message: 'Already executed', affectedEntities: [] } } } as any;
      };
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');

      const result1 = await ExecutionService.execute(identity, request);
      const result2 = await ExecutionService.execute(identity, request);

      const tracking = db.jobTracking.filter((t) => t.status_update === 'ASSIGNED');

      addResult(
        'P3-T7',
        'Repeated execution: second call returns stored result, no duplicate mutation',
        result1.status === 'SUCCESS'
          && result2.status === 'SUCCESS'
          && result2.executionId === 'exec-existing'
          && tracking.length === 1,
        `first=${result1.status}, second=${result2.status}, secondId=${result2.executionId}, trackingCount=${tracking.length}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T7', 'Repeated execution: second call returns stored result, no duplicate mutation', false, e.message);
    }

    // =====================================================================
    // T8 — Domain Failure Propagation
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const jo = db.jobOrders.find((j) => j.id === joId);

      addResult(
        'P3-T8',
        'Domain failure: missing driver entity rejected, no false SUCCESS',
        result.status === 'FAILED' && jo?.status === 'PENDING',
        `status=${result.status}, joStatus=${jo?.status}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T8', 'Domain failure: missing driver entity rejected, no false SUCCESS', false, e.message);
    }

    // =====================================================================
    // T9 — Audit / Lineage
    // =====================================================================
    try {
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';

      db.reset();
      const joId = nextId('jo');
      db.jobOrders.push(seedJo({ id: joId, status: 'PENDING' }));
      db.mdDrivers.push(seedDriver({ id: 'driver-1' }));

      const proposal = buildProposal({ entities: [{ entityType: 'JobOrder', entityId: joId, displayName: 'JO-001' }, { entityType: 'Driver', entityId: 'driver-1', displayName: 'Driver-001' }] });
      ProposalAuthorityService.getProposal = async () => proposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...proposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const request = buildExecutionRequest('CP-2026-09-0001');
      const result = await ExecutionService.execute(identity, request);

      const tracking = db.jobTracking.filter((t) => t.job_order_id === joId && t.status_update === 'ASSIGNED');

      addResult(
        'P3-T9',
        'Audit/lineage: domain tracking record exists after successful ASSIGN_DRIVER',
        result.status === 'SUCCESS'
          && tracking.length === 1
          && tracking[0].job_order_id === joId
          && tracking[0].status_update === 'ASSIGNED',
        `status=${result.status}, trackingCount=${tracking.length}, trackingJobOrderId=${tracking[0]?.job_order_id}`,
      );

      delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
    } catch (e: any) {
      addResult('P3-T9', 'Audit/lineage: domain tracking record exists after successful ASSIGN_DRIVER', false, e.message);
    }

    // =====================================================================
    // T10 — Other Actions Remain Disabled
    // =====================================================================
    try {
      const originalAssignFlag = process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
      const originalCancelFlag = process.env.COPILOT_EXECUTE_CANCEL_JOB;
      const originalReplaceFlag = process.env.COPILOT_EXECUTE_REPLACE_DRIVER;
      process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = 'true';
      delete process.env.COPILOT_EXECUTE_CANCEL_JOB;
      delete process.env.COPILOT_EXECUTE_REPLACE_DRIVER;

      db.reset();

      // CANCEL_JOB
      const cancelProposal = buildProposal({ intent: 'CANCEL_JOB', proposal_number: 'CP-CANCEL', entities: [{ entityType: 'JobOrder', entityId: 'jo-cancel', displayName: 'JO-CANCEL' }] });
      ProposalAuthorityService.getProposal = async () => cancelProposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...cancelProposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const identity = makeCtx();
      const cancelResult = await ExecutionService.execute(identity, {
        proposalId: 'CP-CANCEL',
        proposal: { proposalId: 'CP-CANCEL', intent: 'CANCEL_JOB', entities: [{ entityType: 'JobOrder', entityId: 'jo-cancel', displayName: 'JO-CANCEL' }], requiredPermissions: ['job_order:update'], riskLevel: 'MEDIUM', confirmationMessage: '' },
        confirmation: { confirmed: true, confirmedBy: USER, confirmedAt: new Date().toISOString() },
      });

      // REPLACE_DRIVER
      const replaceProposal = buildProposal({ intent: 'REPLACE_DRIVER', proposal_number: 'CP-REPLACE', entities: [{ entityType: 'JobOrder', entityId: 'jo-replace', displayName: 'JO-REPLACE' }, { entityType: 'Driver', entityId: 'driver-new', displayName: 'Driver-NEW' }] });
      ProposalAuthorityService.getProposal = async () => replaceProposal;
      ProposalAuthorityService.claimProposalForExecution = async () => ({ ...replaceProposal, outcome: 'CLAIMED', lifecycle_state: 'EXECUTABLE' } as any);
      ProposalAuthorityService.recordExecutionResult = async () => {};

      const replaceResult = await ExecutionService.execute(identity, {
        proposalId: 'CP-REPLACE',
        proposal: { proposalId: 'CP-REPLACE', intent: 'REPLACE_DRIVER', entities: [{ entityType: 'JobOrder', entityId: 'jo-replace', displayName: 'JO-REPLACE' }, { entityType: 'Driver', entityId: 'driver-new', displayName: 'Driver-NEW' }], requiredPermissions: ['job_order:update'], riskLevel: 'MEDIUM', confirmationMessage: '' },
        confirmation: { confirmed: true, confirmedBy: USER, confirmedAt: new Date().toISOString() },
      });

      addResult(
        'P3-T10',
        'Other actions disabled: CANCEL_JOB and REPLACE_DRIVER blocked when flags OFF',
        cancelResult.status === 'FAILED' && replaceResult.status === 'FAILED',
        `cancelStatus=${cancelResult.status}, replaceStatus=${replaceResult.status}`,
      );

      // Restore flags
      if (originalAssignFlag) process.env.COPILOT_EXECUTE_ASSIGN_DRIVER = originalAssignFlag;
      else delete process.env.COPILOT_EXECUTE_ASSIGN_DRIVER;
      if (originalCancelFlag) process.env.COPILOT_EXECUTE_CANCEL_JOB = originalCancelFlag;
      if (originalReplaceFlag) process.env.COPILOT_EXECUTE_REPLACE_DRIVER = originalReplaceFlag;
    } catch (e: any) {
      addResult('P3-T10', 'Other actions disabled: CANCEL_JOB and REPLACE_DRIVER blocked when flags OFF', false, e.message);
    }

  } finally {
    restoreProposalMocks();
    _setJobOrderDbClient(null as unknown as JobOrderDbClient);
  }

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nADR-092 Phase 3 ASSIGN_DRIVER Integration/E2E: ${passed}/${results.length} PASS${failed > 0 ? ` (${failed} FAIL)` : ''}`);
  if (failed > 0) {
    results.filter((r) => !r.pass).forEach((r) => {
      console.log(`  FAIL [${r.testId}] ${r.description}: ${r.error}`);
    });
  }

  return { passed, failed, total: results.length };
}
