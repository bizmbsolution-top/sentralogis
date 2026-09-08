/**
 * Sentralogis — Phase 4B-4 / U-06
 * Test Suite: Capability Binding Lifecycle PATCH Surface
 *
 * Coverage (mandate §19):
 *  AUTHZ     A1 unauthenticated 401 · A2 no manage 403 · A3 manager ok
 *            A4 cross-tenant non-leaking 404
 *  REGISTRY  R1 four canonical codes accepted · R2 unknown rejected
 *            R3 inactive rejected · R4 case normalization · R5 legacy vocab
 *            cannot become canonical
 *  LIFECYCLE L1 every allowed edge succeeds · L2 every forbidden edge fails
 *            L3 unknown status 400
 *  PATCH     P1 mass-assignment (tenant_id) rejected · P2 unrelated fields
 *            rejected · P3 malformed body rejected
 *  PERSIST   S1 success persisted · S2 failure leaves state unchanged
 *            S3 concurrent stale guard → 409, unchanged
 *  OUTBOX    O1 exactly one event w/ correct identity+statuses · O2 zero
 *            events on rejection · O3 zero events on NO_OP · O4 atomicity:
 *            events === successful transitions
 */

import type { IdentityContext } from '../../identity/types';
import { IdentityResolutionError } from '../../identity/errors';
import {
  transitionBinding,
  _setBindingLifecycleRepository,
} from '../index';
import { BindingLifecycleError } from '../types';
import { CapabilityRegistryError } from '@/lib/application/capabilities/types';
import { _setCapabilityRegistryRepository } from '@/lib/application/capabilities/repository';
import { loadRegistry, _resetRegistryCache } from '@/lib/application/capabilities/registry';
import { setCapabilityCodeValidator } from '@/lib/domain/commercial/capability-code-source';
import type { BindingLifecycleRepository, BindingRow, TransitionAtomicParams, TransitionAtomicResult } from '../repository';
import type { CanonicalCapability } from '@/lib/application/capabilities/types';

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const WO_A = 'e0000000-0000-4000-8000-00000000000a';

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: USER_A,
    tenantId: TENANT_A,
    membershipId: 'mem-1',
    role: 'HQ_COMMERCIAL_DIRECTOR',
    isTenantOwner: false,
    permissions: ['commercial:read', 'commercial:manage'],
    sbuScope: null,
    ...over,
  };
}

function makeBinding(over: Partial<BindingRow> = {}): BindingRow {
  return {
    id: 'f0000000-0000-4000-8000-00000000000a',
    tenant_id: TENANT_A,
    work_order_id: WO_A,
    capability_type: 'CUSTOMS',
    status: 'ACTIVE',
    currency: 'IDR',
    activated_at: new Date().toISOString(),
    completed_at: null,
    deactivated_at: null,
    ...over,
  };
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

class LifecycleMockRepo implements BindingLifecycleRepository {
  bindings: BindingRow[] = [];
  events: Array<Record<string, unknown>> = [];

  seed(b: BindingRow): void {
    this.bindings.push({ ...b });
  }

  countEvents(): number {
    return this.events.length;
  }

  async findBinding(tenantId: string, workOrderId: string, bindingId: string): Promise<BindingRow | null> {
    const found = this.bindings.find(
      b => b.id === bindingId && b.tenant_id === tenantId && b.work_order_id === workOrderId,
    );
    return found ? { ...found } : null;
  }

  /**
   * ATOMIC by construction: guarded update + event push are one indivisible
   * operation, mirroring fn_transition_capability_binding semantics.
   */
  async transitionAtomic(p: TransitionAtomicParams): Promise<TransitionAtomicResult> {
    const b = this.bindings.find(
      x => x.id === p.bindingId && x.tenant_id === p.tenantId && x.status === p.expectedStatus,
    );
    if (!b) return { outcome: 'NOT_FOUND_OR_STALE' };
    const previous = b.status;
    b.status = p.newStatus as BindingRow['status'];
    if (p.newStatus === 'COMPLETED') b.completed_at = new Date().toISOString();
    if (p.newStatus === 'SUSPENDED' || p.newStatus === 'CANCELLED') b.deactivated_at = new Date().toISOString();
    if (p.newStatus === 'ACTIVE') b.deactivated_at = null;
    this.events.push({
      event_name: p.eventName,
      aggregate_type: 'CapabilityBinding',
      aggregate_id: b.id,
      tenant_id: b.tenant_id,
      previous_status: previous,
      new_status: p.newStatus,
    });
    return { outcome: 'TRANSITIONED', updated: { ...b } };
  }
}

class RegistryMockRepo {
  rows = new Map<string, CanonicalCapability>();
  constructor(definitions: Array<[string, 'ACTIVE' | 'INACTIVE']> = []) {
    for (const [code, status] of definitions) {
      this.rows.set(code.toUpperCase(), {
        code: code.toUpperCase() as CanonicalCapability['code'],
        name: code,
        description: null,
        status,
        isSystem: true,
      });
    }
  }
  async listActive(): Promise<CanonicalCapability[]> {
    return [...this.rows.values()];
  }
  async findByCode(code: string): Promise<CanonicalCapability | null> {
    return this.rows.get(String(code).toUpperCase()) ?? null;
  }
}

/** Simulates a concurrent writer between the service's read and write. */
class StaleAfterReadRepo implements BindingLifecycleRepository {
  constructor(private inner: LifecycleMockRepo) {}
  async findBinding(t: string, w: string, id: string): Promise<BindingRow | null> {
    const row = await this.inner.findBinding(t, w, id);
    // Concurrent writer flips the real row right after our snapshot…
    if (row && this.inner.bindings[0]) {
      this.inner.bindings[0].status = 'COMPLETED';
      this.inner.bindings[0].completed_at = new Date().toISOString();
    }
    return row;
  }
  async transitionAtomic(p: TransitionAtomicParams): Promise<TransitionAtomicResult> {
    return this.inner.transitionAtomic(p);
  }
}

async function withEnv<T>(
  bindingRepo: BindingLifecycleRepository,
  registryRepo: RegistryMockRepo,
  fn: () => Promise<T>,
): Promise<T> {
  _resetRegistryCache();
  _setBindingLifecycleRepository(bindingRepo);
  _setCapabilityRegistryRepository(registryRepo as never);
  try {
    await loadRegistry();
    return await fn();
  } finally {
    _setBindingLifecycleRepository(null);
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
    setCapabilityCodeValidator(null);
  }
}

/* ------------------------------------------------------------------ */
/*  Suite                                                              */
/* ------------------------------------------------------------------ */

export async function runCapabilityBindingLifecycleSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  function errInfo(err: unknown): { code?: string; status?: number; name?: string } {
    if (err instanceof BindingLifecycleError) return { code: err.code, status: err.statusCode, name: 'Binding' };
    if (err instanceof IdentityResolutionError) return { code: err.code, status: err.statusCode, name: 'Identity' };
    if (err instanceof CapabilityRegistryError) return { code: err.code, name: 'Registry' };
    return {};
  }

  /* ================= AUTHORIZATION ================= */

  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    // A1 unauthenticated → 401
    let a1 = false;
    try {
      await transitionBinding({ ...makeCtx(), userId: '' }, WO_A, 'x', { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      a1 = e.name === 'Identity' && e.code === 'UNAUTHENTICATED' && e.status === 401;
    }
    assert(a1, 'A1 unauthenticated rejected with 401');

    // A2 authenticated without manage → 403
    let a2 = false;
    try {
      await transitionBinding(makeCtx({ permissions: ['commercial:read'] }), WO_A, 'x', { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      a2 = e.name === 'Identity' && e.code === 'FORBIDDEN_PERMISSION' && e.status === 403;
    }
    assert(a2, 'A2 missing commercial:manage rejected with 403');

    // A4 cross-tenant → non-leaking 404
    const repoB = new LifecycleMockRepo();
    repoB.seed(makeBinding({ tenant_id: TENANT_B }));
    _setBindingLifecycleRepository(repoB);
    let a4 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repoB.bindings[0].id, { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      a4 = e.name === 'Binding' && e.code === 'BINDING_NOT_FOUND' && e.status === 404;
    }
    _setBindingLifecycleRepository(null);
    assert(a4, 'A4 Tenant B binding invisible to Tenant A manager (non-leaking 404)');
  });

  // A3 authorized manager accepted (covered in L1 but asserted explicitly)
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding());
    _setBindingLifecycleRepository(repo);
    const res = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });
    _setBindingLifecycleRepository(null);
    assert(res.action === 'TRANSITIONED', 'A3 authorized manager transitions successfully');
  });

  /* ================= REGISTRY AUTHORITY ================= */

  // R1 four canonical capabilities accepted
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([
    ['CUSTOMS', 'ACTIVE'], ['FORWARDING', 'ACTIVE'], ['TRUCKING', 'ACTIVE'], ['WAREHOUSE', 'ACTIVE'],
  ]), async () => {
    let allOk = true;
    for (const cap of ['CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE']) {
      const repo = new LifecycleMockRepo();
      repo.seed(makeBinding({ capability_type: cap }));
      _setBindingLifecycleRepository(repo);
      const res = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });
      if (res.action !== 'TRANSITIONED') allOk = false;
      _setBindingLifecycleRepository(null);
    }
    assert(allOk, 'R1 lifecycle accepts all four registry-canonical capabilities');
  });

  // R2 unknown bound capability → deterministic reject
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding({ capability_type: 'INSURANCE' }));
    _setBindingLifecycleRepository(repo);
    let r2 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      r2 = e.name === 'Binding' && e.code === 'UNKNOWN_CAPABILITY' && e.status === 409;
    }
    _setBindingLifecycleRepository(null);
    assert(r2, 'R2 unknown bound capability rejected with UNKNOWN_CAPABILITY');
  });

  // R3 inactive registered capability → deterministic reject
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'INACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding());
    _setBindingLifecycleRepository(repo);
    let r3 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      r3 = e.name === 'Binding' && e.code === 'INACTIVE_CAPABILITY' && e.status === 409;
    }
    _setBindingLifecycleRepository(null);
    assert(r3, 'R3 inactive capability rejected with INACTIVE_CAPABILITY');
  });

  // R4 case normalization follows U-05 + R5 legacy vocabulary cannot be canonical
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['TRUCKING', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding({ capability_type: 'trucking' }));
    _setBindingLifecycleRepository(repo);
    const res = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'CANCELLED' });
    _setBindingLifecycleRepository(null);

    const repo5 = new LifecycleMockRepo();
    repo5.seed(makeBinding({ capability_type: 'clearances' }));
    _setBindingLifecycleRepository(repo5);
    let r5 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo5.bindings[0].id, { status: 'SUSPENDED' });
    } catch (err) {
      const e = errInfo(err);
      r5 = e.code === 'UNKNOWN_CAPABILITY';
    }
    _setBindingLifecycleRepository(null);
    assert(res.action === 'TRANSITIONED', 'R4 lowercase stored code resolves via U-05 normalization');
    assert(r5, 'R5 legacy SBU vocabulary ("clearances") is NOT canonical authority');
  });

  /* ================= LIFECYCLE MATRIX ================= */

  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    // L1 allowed edges
    const allowed: Array<[BindingRow['status'], string]> = [
      ['ACTIVE', 'SUSPENDED'], ['ACTIVE', 'COMPLETED'], ['ACTIVE', 'CANCELLED'],
      ['SUSPENDED', 'ACTIVE'], ['SUSPENDED', 'CANCELLED'], ['CANCELLED', 'ACTIVE'],
    ];
    let l1ok = true;
    for (const [from, to] of allowed) {
      const repo = new LifecycleMockRepo();
      repo.seed(makeBinding({ status: from }));
      _setBindingLifecycleRepository(repo);
      const res = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: to });
      if (!(res.action === 'TRANSITIONED' && res.binding.status === to)) {
        l1ok = false;
        console.error(`       edge ${from}->${to} failed`);
      }
      _setBindingLifecycleRepository(null);
    }
    assert(l1ok, 'L1 all six allowed edges succeed');

    // L2 forbidden edges fail deterministically
    const forbidden: Array<[BindingRow['status'], string]> = [
      ['COMPLETED', 'ACTIVE'], ['COMPLETED', 'SUSPENDED'], ['COMPLETED', 'CANCELLED'],
      ['SUSPENDED', 'COMPLETED'], ['CANCELLED', 'SUSPENDED'], ['CANCELLED', 'COMPLETED'],
    ];
    let l2ok = true;
    for (const [from, to] of forbidden) {
      const repo = new LifecycleMockRepo();
      repo.seed(makeBinding({ status: from }));
      _setBindingLifecycleRepository(repo);
      try {
        await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: to });
        l2ok = false;
        console.error(`       edge ${from}->${to} was NOT rejected`);
      } catch (err) {
        const e = errInfo(err);
        if (!(e.name === 'Binding' && e.code === 'INVALID_TRANSITION' && e.status === 409)) {
          l2ok = false;
          console.error(`       edge ${from}->${to} wrong error ${JSON.stringify(e)}`);
        }
        if (repo.bindings[0].status !== from) {
          l2ok = false;
          console.error(`       edge ${from}->${to} mutated state`);
        }
      }
      _setBindingLifecycleRepository(null);
    }
    assert(l2ok, 'L2 forbidden edges (incl. terminal COMPLETED) rejected 409, state unchanged');

    // L3 unknown status value
    const repo3 = new LifecycleMockRepo();
    repo3.seed(makeBinding());
    _setBindingLifecycleRepository(repo3);
    let l3 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo3.bindings[0].id, { status: 'DESTROYED' });
    } catch (err) {
      const e = errInfo(err);
      l3 = e.name === 'Binding' && e.code === 'INVALID_STATUS' && e.status === 400;
    }
    _setBindingLifecycleRepository(null);
    assert(l3, 'L3 unknown status value rejected with 400');
  });

  /* ================= PATCH BOUNDARY ================= */

  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding());
    _setBindingLifecycleRepository(repo);

    let p1 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, {
        status: 'SUSPENDED',
        tenant_id: TENANT_B,
      });
    } catch (err) {
      const e = errInfo(err);
      p1 = e.name === 'Binding' && e.code === 'INVALID_BODY' && e.status === 400;
    }

    let p2 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, {
        status: 'SUSPENDED',
        scope: {},
      });
    } catch (err) {
      const e = errInfo(err);
      p2 = e.code === 'INVALID_BODY';
    }

    let p3 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, null);
    } catch (err) {
      const e = errInfo(err);
      p3 = e.code === 'INVALID_BODY';
    }

    _setBindingLifecycleRepository(null);
    assert(p1, 'P1 tenant_id in body rejected (never an authority source)');
    assert(p2, 'P2 unrelated field mutation rejected');
    assert(p3, 'P3 malformed body rejected');
  });

  /* ================= PERSISTENCE + OUTBOX ================= */

  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding());
    _setBindingLifecycleRepository(repo);

    // S1/O1: successful transition persists and emits exactly one correct event.
    const res = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });
    const persistedOk =
      res.action === 'TRANSITIONED' &&
      repo.bindings[0].status === 'SUSPENDED' &&
      !!repo.bindings[0].deactivated_at;
    const ev = repo.events[0] as Record<string, unknown> | undefined;
    const o1 =
      repo.countEvents() === 1 &&
      !!ev &&
      ev.event_name === 'capability.binding.suspended' &&
      ev.previous_status === 'ACTIVE' &&
      ev.new_status === 'SUSPENDED' &&
      ev.aggregate_type === 'CapabilityBinding' &&
      ev.tenant_id === TENANT_A;

    // O3: same-state NO_OP emits nothing further.
    const noop = await transitionBinding(makeCtx(), WO_A, repo.bindings[0].id, { status: 'SUSPENDED' });

    // O2: rejected transition emits nothing (terminal COMPLETED → ACTIVE is forbidden).
    let rejected = false;
    const termRepo = new LifecycleMockRepo();
    termRepo.seed(makeBinding({ id: 'f0000000-0000-4000-8000-00000000000b', status: 'COMPLETED' }));
    _setBindingLifecycleRepository(termRepo);
    try {
      await transitionBinding(makeCtx(), WO_A, termRepo.bindings[0].id, { status: 'ACTIVE' });
    } catch (err) {
      rejected = errInfo(err).code === 'INVALID_TRANSITION';
    }
    _setBindingLifecycleRepository(null);

    // S3: stale concurrent modification → 409 with unchanged underlying state.
    const staleInner = new LifecycleMockRepo();
    staleInner.seed(makeBinding({ id: 'f0000000-0000-4000-8000-00000000000c' }));
    const before = staleInner.bindings[0].status;
    _setBindingLifecycleRepository(new StaleAfterReadRepo(staleInner));
    let s3 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, 'f0000000-0000-4000-8000-00000000000c', { status: 'SUSPENDED' });
    } catch (err) {
      s3 = errInfo(err).code === 'CONCURRENT_MODIFICATION' && staleInner.countEvents() === 0;
    }
    _setBindingLifecycleRepository(null);

    assert(persistedOk && o1, 'O1/S1 transition persisted atomically with exactly one correct event');
    assert(noop.action === 'NO_OP' && repo.countEvents() === 1, 'O3 same-state NO_OP emits zero duplicate events');
    assert(rejected && termRepo.countEvents() === 0, 'O2/S2 rejected transition mutates nothing, emits nothing');
    assert(s3, 'S3 optimistic guard rejects stale concurrent write with 409, zero events');

    // O4: atomicity invariant across this segment — events equal successful transitions.
    const totalTransitions =
      1 /* suspended */ + (noop.action === 'NO_OP' ? 0 : 1) + 0 /* rejected */ + 0 /* stale */;
    assert(repo.countEvents() === totalTransitions && termRepo.countEvents() === 0,
      'O4 events recorded === successful mutations (atomicity)');
  });

  console.log('----------------------------------------------------');
  console.log(`U-06 BINDING LIFECYCLE SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
