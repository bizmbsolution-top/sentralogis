/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/application/capabilities/registry.ts
 *
 * Deterministic registry resolution:
 *
 *   resolveCapability(code)
 *     → normalize case (T9)
 *     → cache (in-memory snapshot)
 *     → repository (authoritative)
 *     → static fallback (ONLY for the four canonical codes; DB unavailable)
 *     → else REJECT with UNKNOWN_CAPABILITY (never create — §16/§17)
 *
 * The registry is also wired into the domain layer's capability-code
 * validation seam so future binding logic consumes registry truth instead of
 * hard-coded branching (§9/§15). The default domain behavior remains
 * unchanged until this module loads + syncs.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { setCapabilityCodeValidator } from '@/lib/domain/commercial/capability-code-source';
import { getCapabilityRegistryRepository } from './repository';
import type {
  CanonicalCapability,
  CapabilityCode,
} from './types';
import { CapabilityRegistryError } from './types';

/* ------------------------------------------------------------------ */
/*  Static canonical fallback (read-only, NEVER creates)               */
/* ------------------------------------------------------------------ */

export const CANONICAL_CAPABILITY_CODES: readonly CapabilityCode[] = [
  'CUSTOMS',
  'FORWARDING',
  'TRUCKING',
  'WAREHOUSE',
];

const FALLBACK_CAPABILITIES: Record<CapabilityCode, CanonicalCapability> = {
  CUSTOMS: {
    code: 'CUSTOMS',
    name: 'Customs Clearance',
    description: 'Customs clearance and trade compliance capability (PPJK).',
    status: 'ACTIVE',
    isSystem: true,
  },
  FORWARDING: {
    code: 'FORWARDING',
    name: 'Forwarding',
    description: 'Domestic/international freight forwarding (FCL/LCL, consol).',
    status: 'ACTIVE',
    isSystem: true,
  },
  TRUCKING: {
    code: 'TRUCKING',
    name: 'Trucking',
    description: 'Land transportation execution capability.',
    status: 'ACTIVE',
    isSystem: true,
  },
  WAREHOUSE: {
    code: 'WAREHOUSE',
    name: 'Warehouse',
    description: 'Warehousing, storage, and fulfilment capability.',
    status: 'ACTIVE',
    isSystem: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Cache                                                              */
/* ------------------------------------------------------------------ */

let _cache: Map<string, CanonicalCapability> | null = null;
let _loadPromise: Promise<void> | null = null;

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Load (or reload) the registry snapshot from the authoritative repository. */
export async function loadRegistry(): Promise<void> {
  const repo = getCapabilityRegistryRepository();
  const capabilities = await repo.listActive();
  const next = new Map<string, CanonicalCapability>();
  for (const cap of capabilities) {
    next.set(normalizeCode(cap.code), cap);
  }
  // Guarantee the four canonical codes are always resolvable even if a bad
  // admin state deactivated them in the snapshot — definitions never vanish.
  for (const code of CANONICAL_CAPABILITY_CODES) {
    if (!next.has(code)) next.set(code, FALLBACK_CAPABILITIES[code]);
  }
  _cache = next;

  // Sync the domain validation seam with registry truth (§15).
  const codes = new Set(next.keys());
  setCapabilityCodeValidator((candidate: string) => codes.has(normalizeCode(candidate)));
}

/** Lazy single-load used by resolution paths. */
async function ensureLoaded(): Promise<Map<string, CanonicalCapability>> {
  if (_cache) return _cache;
  if (!_loadPromise) {
    _loadPromise = loadRegistry()
      .catch(err => {
        _loadPromise = null;
        throw err;
      });
  }
  await _loadPromise;
  return _cache ?? new Map<string, CanonicalCapability>();
}

/** Test hook: clear cache + domain sync (restores pristine defaults). */
export function _resetRegistryCache(): void {
  _cache = null;
  _loadPromise = null;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Resolve a canonical capability by code.
 *
 * @param ctx   authenticated identity context — required (infrastructure read);
 *              no extra permission needed: the vocabulary is readable by any
 *              authenticated principal (documented decision, §13).
 * @param raw   capability code; case-insensitive normalization applied.
 * @throws {CapabilityRegistryError} UNKNOWN_CAPABILITY / INACTIVE_CAPABILITY /
 *         UNAUTHENTICATED / REPOSITORY_ERROR.
 */
export async function resolveCapability(
  ctx: IdentityContext,
  raw: string,
): Promise<CanonicalCapability> {
  if (!ctx || !ctx.userId) {
    throw new CapabilityRegistryError('UNAUTHENTICATED', 'Authenticated context required.');
  }

  const code = normalizeCode(String(raw ?? ''));
  if (!code) {
    throw new CapabilityRegistryError('UNKNOWN_CAPABILITY', 'Capability code is empty.');
  }

  let snapshot: Map<string, CanonicalCapability>;
  try {
    snapshot = await ensureLoaded();
  } catch (err) {
    // Fallback path: DB unavailable — resolve ONLY known canonical values.
    if ((CANONICAL_CAPABILITY_CODES as readonly string[]).includes(code)) {
      return FALLBACK_CAPABILITIES[code as CapabilityCode];
    }
    throw new CapabilityRegistryError(
      'REPOSITORY_ERROR',
      `Registry unavailable and "${code}" is not a canonical fallback capability.`,
    );
  }

  const found = snapshot.get(code);
  if (!found) {
    throw new CapabilityRegistryError(
      'UNKNOWN_CAPABILITY',
      `"${code}" is not a registered capability.`,
    );
  }
  if (found.status !== 'ACTIVE') {
    throw new CapabilityRegistryError(
      'INACTIVE_CAPABILITY',
      `Capability "${code}" is currently inactive.`,
    );
  }
  return found;
}

/**
 * Synchronous check against the loaded snapshot (no I/O).
 * Returns false when the registry has not been loaded yet AND the code is not
 * one of the four canonical fallback codes.
 */
export function isRegisteredCapability(raw: string): boolean {
  const code = normalizeCode(String(raw ?? ''));
  if (_cache) return _cache.has(code);
  return (CANONICAL_CAPABILITY_CODES as readonly string[]).includes(code);
}

/** List active capabilities (authenticated infrastructure read). */
export async function listCapabilities(ctx: IdentityContext): Promise<CanonicalCapability[]> {
  if (!ctx || !ctx.userId) {
    throw new CapabilityRegistryError('UNAUTHENTICATED', 'Authenticated context required.');
  }
  const snapshot = await ensureLoaded();
  return [...snapshot.values()]
    .filter(c => c.status === 'ACTIVE')
    .sort((a, b) => a.code.localeCompare(b.code));
}
