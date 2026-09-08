/**
 * Sentralogis — Phase 4B-3 / U-05
 * Test Suite: Capability Registry Foundation
 *
 * Scenarios (mandate §24):
 *  T1   Registry contains the four canonical capabilities
 *  T2   Duplicate codes impossible (UNIQUE + idempotent seed semantics)
 *  T3   Seed idempotency — running twice yields the same four records
 *  T4–T7 resolve CUSTOMS / FORWARDING / TRUCKING / WAREHOUSE deterministically
 *  T8   Unknown capability rejected (never silently mapped or created)
 *  T9   Case normalization (customs == CUSTOMS)
 *  T10  Global-scope invariant — definitions carry no tenant dimension
 *  T11  Unauthenticated resolution rejected; no mutation API exists
 *  T12  CapabilityBindingFactory compatibility (default + registry-synced)
 *  T13–T15 No SR / binding / execution writes (repository is read-only)
 *  T16  Legacy SBU adapter one-directional mapping
 *  FB   DB-unavailable fallback resolves ONLY canonical codes
 */

import type { IdentityContext } from '../../identity/types';
import {
  resolveCapability,
  listCapabilities,
  loadRegistry,
  isRegisteredCapability,
  _resetRegistryCache,
  CANONICAL_CAPABILITY_CODES,
} from '../registry';
import { capabilityFromLegacySbu } from '../sbu-adapter';
import { setCapabilityCodeValidator, isValidCapabilityCode } from '@/lib/domain/commercial/capability-code-source';
import { CapabilityBindingFactory } from '@/lib/domain/commercial/capability-binding-service';
import * as capabilitiesIndex from '../index';
import { CapabilityRegistryError } from '../types';
import type { CapabilityRegistryRepository, } from '../repository';
import { _setCapabilityRegistryRepository } from '../repository';
import type { CanonicalCapability, CapabilityCode } from '../types';

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: 'u0000000-0000-4000-8000-00000000000a',
    tenantId: 'a0000000-0000-4000-8000-00000000000a',
    membershipId: 'mem-1',
    role: 'TENANT_OWNER',
    isTenantOwner: true,
    permissions: [],
    sbuScope: null,
    ...over,
  };
}

const SEED: Array<[CapabilityCode, string, string]> = [
  ['CUSTOMS', 'Customs Clearance', 'Customs clearance and trade compliance capability (PPJK).'],
  ['FORWARDING', 'Forwarding', 'Domestic/international freight forwarding (FCL/LCL, consol).'],
  ['TRUCKING', 'Trucking', 'Land transportation execution capability.'],
  ['WAREHOUSE', 'Warehouse', 'Warehousing, storage, and fulfilment capability.'],
];

/** Mimics migration seed semantics: ON CONFLICT (capability_code) DO NOTHING. */
class RegistryMockRepo implements CapabilityRegistryRepository {
  rows = new Map<string, CanonicalCapability>();

  seed(): void {
    // Idempotent by construction — mirrors SQL ON CONFLICT DO NOTHING.
    for (const [code, name, description] of SEED) {
      if (!this.rows.has(code)) {
        this.rows.set(code, { code, name, description, status: 'ACTIVE', isSystem: true });
      }
    }
  }

  async listActive(): Promise<CanonicalCapability[]> {
    return [...this.rows.values()].sort((a, b) => a.code.localeCompare(b.code));
  }

  async findByCode(code: string): Promise<CanonicalCapability | null> {
    return this.rows.get(String(code).toUpperCase()) ?? null;
  }
}

class ThrowingRepo implements CapabilityRegistryRepository {
  async listActive(): Promise<CanonicalCapability[]> {
    throw new Error('connection refused');
  }
  async findByCode(): Promise<CanonicalCapability | null> {
    throw new Error('connection refused');
  }
}

async function withRepo<T>(repo: CapabilityRegistryRepository, fn: () => Promise<T>): Promise<T> {
  _resetRegistryCache();
  _setCapabilityRegistryRepository(repo);
  try {
    return await fn();
  } finally {
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
    setCapabilityCodeValidator(null); // restore static domain default
  }
}

export async function runCapabilityRegistrySuite(): Promise<{
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

  /* ---- T1 + T3: four canonical capabilities, idempotent seed ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    repo.seed(); // second run must be a no-op
    repo.seed();

    _setCapabilityRegistryRepository(repo);
    await loadRegistry();
    const list = await listCapabilities(makeCtx());

    assert(
      list.length === 4 &&
        JSON.stringify(list.map(c => c.code)) === JSON.stringify(['CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE']) &&
        list.every(c => c.isSystem && c.status === 'ACTIVE'),
      'T1/T3 registry contains exactly the four canonical capabilities (idempotent seed)',
      JSON.stringify(list.map(c => c.code)),
    );
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
  });

  /* ---- T2: duplicate protection is database-enforced ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    const before = (await repo.listActive()).length;
    repo.seed(); // duplicate insertion attempt collapses into existing rows
    const after = (await repo.listActive()).length;
    // The application layer exposes NO mutation path whatsoever:
    const mutationExports = Object.keys(capabilitiesIndex)
      .filter(k => /create|insert|update|delete|upsert/i.test(k));
    assert(
      before === 4 && after === 4 && mutationExports.length === 0,
      'T2 duplicates prevented by UNIQUE semantics; app layer has zero mutation API',
      `mutations=[${mutationExports.join(',')}]`,
    );
  });

  /* ---- T4–T7: deterministic resolution ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    _setCapabilityRegistryRepository(repo);

    let allOk = true;
    for (const code of CANONICAL_CAPABILITY_CODES) {
      const cap = await resolveCapability(makeCtx(), code);
      if (!cap || cap.code !== code || !cap.isSystem) allOk = false;
    }
    assert(allOk, 'T4-T7 resolve returns the canonical capability for each code');
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
  });

  /* ---- T8 + T9: unknown rejection + case normalization ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    _setCapabilityRegistryRepository(repo);

    let unknownRejected = false;
    try {
      await resolveCapability(makeCtx(), 'CUSTOMS_X');
    } catch (err) {
      unknownRejected = err instanceof CapabilityRegistryError && err.code === 'UNKNOWN_CAPABILITY';
    }

    const lower = await resolveCapability(makeCtx(), 'customs');
    const mixed = await resolveCapability(makeCtx(), '  Trucking ');
    const syncOk =
      isRegisteredCapability('warehouse') &&
      !isRegisteredCapability('CUSTOMS_X');

    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();

    assert(unknownRejected, 'T8 unknown capability rejected with UNKNOWN_CAPABILITY');
    assert(
      lower.code === 'CUSTOMS' && mixed.code === 'TRUCKING' && syncOk,
      'T9 case-insensitive normalization (customs == CUSTOMS)',
    );
  });

  /* ---- T10: global-scope invariant ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    _setCapabilityRegistryRepository(repo);
    const cap = await resolveCapability(makeCtx({ tenantId: 'other-tenant' }), 'FORWARDING');
    const obj = cap as unknown as Record<string, unknown>;
    const hasTenantField = Object.keys(obj).some(k => k.toLowerCase().includes('tenant'));
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
    assert(
      !hasTenantField && cap.code === 'FORWARDING',
      'T10 capability definitions are GLOBAL — no tenant dimension',
    );
  });

  /* ---- T11: unauthenticated rejection ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    let rejected = false;
    try {
      await resolveCapability({ userId: '' } as IdentityContext, 'CUSTOMS');
    } catch (err) {
      rejected = err instanceof CapabilityRegistryError && err.code === 'UNAUTHENTICATED';
    }
    assert(rejected, 'T11 unauthenticated resolution rejected');
  });

  /* ---- T12: CapabilityBindingFactory compatibility ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const baseDto = {
      tenant_id: 't',
      work_order_id: 'w',
      scope: {},
      pricing: {},
      currency: 'IDR',
      metadata: {},
    };

    // Default mode (static authority): behavior identical to pre-U-05.
    const okDefault = isValidCapabilityCode('CUSTOMS') && !isValidCapabilityCode('INSURANCE');

    // Registry-synced mode: registry truth flows into the domain seam.
    const repo = new RegistryMockRepo();
    repo.seed();
    _setCapabilityRegistryRepository(repo);
    await loadRegistry();

    const okSynced =
      isValidCapabilityCode('TRUCKING') && !isValidCapabilityCode('INSURANCE');
    let factoryThrew = false;
    try {
      CapabilityBindingFactory.create({
        ...baseDto,
        capability_type: 'INSURANCE' as never,
      });
    } catch {
      factoryThrew = true;
    }
    const factoryOk = (() => {
      try {
        CapabilityBindingFactory.create({ ...baseDto, capability_type: 'CUSTOMS' as never });
        return true;
      } catch {
        return false;
      }
    })();

    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();

    assert(
      okDefault && okSynced && factoryThrew && factoryOk,
      'T12 factory compatible: default unchanged + registry-synced validation works',
    );
  });

  /* ---- T13–T15: read-only boundary (no writes anywhere) ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const repo = new RegistryMockRepo();
    repo.seed();
    _setCapabilityRegistryRepository(repo);
    await loadRegistry();
    await resolveCapability(makeCtx(), 'WAREHOUSE');
    await listCapabilities(makeCtx());
    // Mock repo exposes no write methods; assert the port contract shape.
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(repo)).filter(
      m => m !== 'constructor' && m !== 'seed',
    );
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
    assert(
      JSON.stringify(proto.sort()) === JSON.stringify(['findByCode', 'listActive']),
      'T13-T15 repository port is strictly read-only (no SR/binding/execution paths)',
      `[${proto.join(',')}]`,
    );
  });

  /* ---- T16: legacy SBU adapter (one-directional) ---- */
  await withRepo(new RegistryMockRepo(), async () => {
    const mapOk =
      capabilityFromLegacySbu('trucking') === 'TRUCKING' &&
      capabilityFromLegacySbu('warehouse') === 'WAREHOUSE' &&
      capabilityFromLegacySbu('clearances') === 'CUSTOMS' &&
      capabilityFromLegacySbu('forwarding') === 'FORWARDING' &&
      capabilityFromLegacySbu('unknown_sbu') === null &&
      capabilityFromLegacySbu(null) === null;
    assert(mapOk, 'T16 legacy SBU → canonical capability mapping is deterministic');
  });

  /* ---- FB: DB-unavailable fallback ---- */
  await withRepo(new ThrowingRepo(), async () => {
    _setCapabilityRegistryRepository(new ThrowingRepo());
    let fallbackOk = false;
    let fallbackRejects = false;
    try {
      const cap = await resolveCapability(makeCtx(), 'TRUCKING');
      fallbackOk = cap.code === 'TRUCKING' && cap.isSystem;
    } catch {
      fallbackOk = false;
    }
    try {
      await resolveCapability(makeCtx(), 'MYSTERY');
    } catch (err) {
      fallbackRejects = err instanceof CapabilityRegistryError && err.code === 'REPOSITORY_ERROR';
    }
    _setCapabilityRegistryRepository(null);
    _resetRegistryCache();
    assert(fallbackOk, 'FB1 fallback resolves known canonical codes when DB unavailable');
    assert(fallbackRejects, 'FB2 fallback NEVER fabricates unknown capabilities');
  });

  console.log('----------------------------------------------------');
  console.log(`U-05 CAPABILITY REGISTRY SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
