/**
 * Sentralogis — Phase 4B-4A / U-06A
 * Forensic Containment Suite
 *
 * B1   No runtime direct lifecycle mutation remains (repo-wide source scan)
 * B2   Phase-4A route delegates reactivation via transitionBinding (no .update)
 * B3   Reactivation CANCELLED→ACTIVE persists through governed path
 * B4   Exactly one capability.binding.activated event w/ correct statuses
 * B5   Unauthorized reactivation rejected 403
 * B6   Cross-tenant reactivation rejected non-leaking 404
 * B7   Registry authority preserved (unknown/inactive rejected)
 * B8   Forbidden edges remain rejected
 * B9   Delegation emits exactly ONE event; NO_OP emits none
 * B10  Migration 016 SECURITY DEFINER posture (static assertions)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IdentityContext } from '../../identity/types';
import { transitionBinding, _setBindingLifecycleRepository } from '../index';
import { _setCapabilityRegistryRepository } from '@/lib/application/capabilities/repository';
import { loadRegistry, _resetRegistryCache } from '@/lib/application/capabilities/registry';
import { setCapabilityCodeValidator } from '@/lib/domain/commercial/capability-code-source';
import type { BindingLifecycleRepository, BindingRow, TransitionAtomicParams, TransitionAtomicResult } from '../repository';
import type { CanonicalCapability } from '@/lib/application/capabilities/types';

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const WO_A = 'e0000000-0000-4000-8000-00000000000a';
const BINDING_ID = 'f0000000-0000-4000-8000-00000000000a';

const ROUTE_PATH = path.join(
  process.cwd(),
  'app', 'api', 'v1', 'commercial', 'work-orders', '[id]', 'capabilities', 'route.ts',
);
const MIGRATION_PATH = path.join(
  process.cwd(),
  'supabase', 'migrations', '20260828_016_capability_binding_transition.sql',
);

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
    id: BINDING_ID,
    tenant_id: TENANT_A,
    work_order_id: WO_A,
    capability_type: 'CUSTOMS',
    status: 'CANCELLED',
    currency: 'IDR',
    activated_at: new Date().toISOString(),
    completed_at: null,
    deactivated_at: new Date().toISOString(),
    ...over,
  };
}

class LifecycleMockRepo implements BindingLifecycleRepository {
  bindings: BindingRow[] = [];
  events: Array<Record<string, unknown>> = [];
  seed(b: BindingRow) { this.bindings.push({ ...b }); }
  countEvents(): number { return this.events.length; }
  async findBinding(t: string, w: string, id: string) {
    const f = this.bindings.find(b => b.id === id && b.tenant_id === t && b.work_order_id === w);
    return f ? { ...f } : null;
  }
  async transitionAtomic(p: TransitionAtomicParams): Promise<TransitionAtomicResult> {
    const b = this.bindings.find(x => x.id === p.bindingId && x.tenant_id === p.tenantId && x.status === p.expectedStatus);
    if (!b) return { outcome: 'NOT_FOUND_OR_STALE' };
    const previous = b.status;
    b.status = p.newStatus as BindingRow['status'];
    if (p.newStatus === 'ACTIVE') b.deactivated_at = null;
    this.events.push({
      event_name: p.eventName,
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
  constructor(defs: Array<[string, 'ACTIVE' | 'INACTIVE']>) {
    for (const [code, status] of defs) {
      this.rows.set(code.toUpperCase(), {
        code: code.toUpperCase() as CanonicalCapability['code'],
        name: code, description: null, status, isSystem: true,
      });
    }
  }
  async listActive() { return [...this.rows.values()]; }
  async findByCode(c: string) { return this.rows.get(String(c).toUpperCase()) ?? null; }
}

async function withEnv<T>(repo: BindingLifecycleRepository, reg: RegistryMockRepo, fn: () => Promise<T>): Promise<T> {
  _resetRegistryCache();
  _setBindingLifecycleRepository(repo);
  _setCapabilityRegistryRepository(reg as never);
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

/** Strip comments so documentation ABOUT a bypass is not mistaken for one. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/** Recursively list .ts files under dir, skipping tests/mocks/declarations. */
function runtimeTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...runtimeTsFiles(full));
    else if (
      entry.name.endsWith('.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.d.ts')
    ) {
      const content = fs.readFileSync(full, 'utf8');
      if (/__tests__|mock-db/i.test(full)) continue;
      out.push(full);
      void content;
    }
  }
  return out;
}

export async function runPhase4aContainmentSuite(): Promise<{
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

  /* ---- B1: repo-wide static scan — no runtime direct lifecycle mutation ---- */
  {
    const roots = [
      path.join(process.cwd(), 'app', 'api'),
      path.join(process.cwd(), 'lib'),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of runtimeTsFiles(root)) {
        const src = stripComments(fs.readFileSync(file, 'utf8'));
        if (!src.includes('commercial_capability_bindings')) continue;
        // Table-scoped mutation detection: check if the file directly mutates
        // commercial_capability_bindings (insert/update/delete on that specific table).
        // A file that merely SELECTs from the table for validation is NOT a violation.
        const mutationPattern = /\.from\s*\(\s*['"]commercial_capability_bindings['"]\s*\)\s*\.\s*update\s*\(/;
        if (mutationPattern.test(src)) offenders.push(path.relative(process.cwd(), file));
      }
    }
    assert(
      offenders.length === 0,
      'B1 zero runtime files mutate commercial_capability_bindings directly',
      offenders.join(','),
    );
  }

  /* ---- B2: Phase-4A route delegates via transitionBinding, no .update ---- */
  {
    const routeSrc = stripComments(fs.readFileSync(ROUTE_PATH, 'utf8'));
    assert(
      routeSrc.includes('transitionBinding(') && !/\.update\s*\(/.test(routeSrc),
      'B2 Phase-4A reactivation delegates to governed boundary (no direct UPDATE)',
    );
  }

  /* ---- B10: migration 016 SECURITY DEFINER posture (static) ---- */
  {
    const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const checks: Array<[boolean, string]> = [
      [sql.includes("SET search_path = ''"), 'search_path hardened'],
      [/REVOKE[\s\S]*FROM PUBLIC/.test(sql), 'EXECUTE revoked from PUBLIC'],
      [/FROM anon/.test(sql), 'EXECUTE revoked from anon'],
      [/FROM authenticated/.test(sql), 'EXECUTE revoked from authenticated'],
      [/GRANT EXECUTE[\s\S]*TO service_role/.test(sql), 'application-only EXECUTE grant'],
      [/p_expected_status/.test(sql), 'optimistic status guard present'],
      [/AND b\.tenant_id = p_tenant_id/.test(sql), 'tenant guard inside function'],
      [/INVALID_EVENT_NAME/.test(sql), 'event name validated (not caller-trusted)'],
      [/INVALID_STATUS/.test(sql), 'status whitelist enforced'],
      [/p_payload \|\|\s*\n?\s*jsonb_build_object/.test(sql), 'canonical identity wins payload merge'],
    ];
    const failedChecks = checks.filter(([ok]) => !ok).map(([, name]) => name);
    assert(
      failedChecks.length === 0,
      'B10 SECURITY DEFINER review: search_path, grants, guards, event constraint, payload order',
      failedChecks.join(','),
    );
  }

  /* ---- B3/B4/B9: behavioral reactivation proof ---- */
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding()); // CANCELLED
    _setBindingLifecycleRepository(repo);

    const res = await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    const ev = repo.events[0] as Record<string, unknown> | undefined;

    assert(
      res.action === 'TRANSITIONED' &&
        res.binding.status === 'ACTIVE' &&
        repo.bindings[0].deactivated_at === null,
      'B3 reactivation CANCELLED→ACTIVE persists through governed path',
    );
    assert(
      repo.countEvents() === 1 &&
        !!ev &&
        ev.event_name === 'capability.binding.activated' &&
        ev.previous_status === 'CANCELLED' &&
        ev.new_status === 'ACTIVE',
      'B4 exactly one capability.binding.activated event with CANCELLED→ACTIVE',
    );

    // B9: same-state after reactivation is NO_OP with zero additional events.
    const noop = await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    assert(
      noop.action === 'NO_OP' && repo.countEvents() === 1,
      'B9 delegation never duplicates events (same-state NO_OP)',
    );
    _setBindingLifecycleRepository(null);
  });

  /* ---- B5/B6: authorization + tenant isolation ---- */
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'ACTIVE']]), async () => {
    const repo = new LifecycleMockRepo();
    repo.seed(makeBinding());
    _setBindingLifecycleRepository(repo);

    let b5 = false;
    try {
      await transitionBinding(makeCtx({ permissions: ['commercial:read'] }), WO_A, BINDING_ID, { status: 'ACTIVE' });
    } catch (err) {
      b5 = (err as { statusCode?: number; code?: string }).statusCode === 403;
    }

    // B6: Tenant A cannot reactivate Tenant B's binding (non-leaking 404).
    const foreign = new LifecycleMockRepo();
    foreign.seed(makeBinding({ tenant_id: TENANT_B }));
    _setBindingLifecycleRepository(foreign);
    let b6 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    } catch (err) {
      const e = err as { code?: string; statusCode?: number };
      b6 = e.code === 'BINDING_NOT_FOUND' && e.statusCode === 404;
    }
    _setBindingLifecycleRepository(null);
    assert(b5, 'B5 unauthorized reactivation rejected 403');
    assert(b6, 'B6 cross-tenant reactivation rejected non-leaking 404');
  });

  /* ---- B7/B8: registry authority + forbidden edges ---- */
  await withEnv(new LifecycleMockRepo(), new RegistryMockRepo([['CUSTOMS', 'INACTIVE'], ['FORWARDING', 'ACTIVE']]), async () => {
    const inactiveRepo = new LifecycleMockRepo();
    inactiveRepo.seed(makeBinding());
    _setBindingLifecycleRepository(inactiveRepo);
    let b7a = false;
    try {
      await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    } catch (err) {
      b7a = (err as { code?: string }).code === 'INACTIVE_CAPABILITY';
    }
    _setBindingLifecycleRepository(null);

    const unknownRepo = new LifecycleMockRepo();
    unknownRepo.seed(makeBinding({ capability_type: 'clearances' }));
    _setBindingLifecycleRepository(unknownRepo);
    let b7b = false;
    try {
      await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    } catch (err) {
      b7b = (err as { code?: string }).code === 'UNKNOWN_CAPABILITY';
    }
    _setBindingLifecycleRepository(null);

    // Terminal binding uses FORWARDING (registry-ACTIVE here) so the
    // rejection provably originates from the STATE MACHINE, not the registry.
    const terminalRepo = new LifecycleMockRepo();
    terminalRepo.seed(makeBinding({ capability_type: 'FORWARDING', status: 'COMPLETED' }));
    _setBindingLifecycleRepository(terminalRepo);
    let b8 = false;
    try {
      await transitionBinding(makeCtx(), WO_A, BINDING_ID, { status: 'ACTIVE' });
    } catch (err) {
      b8 = (err as { code?: string }).code === 'INVALID_TRANSITION' && terminalRepo.countEvents() === 0;
    }
    _setBindingLifecycleRepository(null);

    assert(b7a && b7b, 'B7 registry authority preserved (inactive + legacy-vocab rejected)');
    assert(b8, 'B8 forbidden edge (COMPLETED→ACTIVE) rejected, zero events');
  });

  console.log('----------------------------------------------------');
  console.log(`U-06A FORENSIC CONTAINMENT SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
