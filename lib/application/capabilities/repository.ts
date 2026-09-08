/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/application/capabilities/repository.ts
 *
 * Repository boundary for the capability registry. Read-only by design:
 * the application layer exposes NO mutation path (registry mutates only via
 * authorized migrations / admin tooling) — unauthorized mutation is
 * impossible by construction (§13/T11).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CanonicalCapability, CapabilityCode, CapabilityStatus } from './types';

export interface CapabilityRegistryRepository {
  listActive(): Promise<CanonicalCapability[]>;
  findByCode(code: CapabilityCode | string): Promise<CanonicalCapability | null>;
}

function mapRow(row: Record<string, unknown>): CanonicalCapability {
  return {
    code: row.capability_code as CapabilityCode,
    name: row.name as string,
    description: (row.description as string) ?? null,
    status: row.status as CapabilityStatus,
    isSystem: Boolean(row.is_system),
  };
}

export const supabaseCapabilityRegistryRepository: CapabilityRegistryRepository = {
  async listActive() {
    const { data, error } = await supabaseAdmin
      .from('commercial_capability_registry')
      .select('capability_code, name, description, status, is_system')
      .order('capability_code', { ascending: true });

    if (error) throw new Error(`listCapabilities: ${error.message}`);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapRow);
  },

  async findByCode(code) {
    const { data, error } = await supabaseAdmin
      .from('commercial_capability_registry')
      .select('capability_code, name, description, status, is_system')
      .eq('capability_code', code)
      .maybeSingle();

    if (error) throw new Error(`findCapability: ${error.message}`);
    return data ? mapRow(data as unknown as Record<string, unknown>) : null;
  },
};

/* ------------------------------------------------------------------ */
/*  Injection seam for tests                                           */
/* ------------------------------------------------------------------ */

let _repo: CapabilityRegistryRepository = supabaseCapabilityRegistryRepository;

/** Override the repository for testing. Pass null to restore production. */
export function _setCapabilityRegistryRepository(
  repo: CapabilityRegistryRepository | null,
): void {
  _repo = repo ?? supabaseCapabilityRegistryRepository;
}

export function getCapabilityRegistryRepository(): CapabilityRegistryRepository {
  return _repo;
}
