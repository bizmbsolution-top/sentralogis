/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/application/capabilities/sbu-adapter.ts
 *
 * EXPLICIT one-directional compatibility adapter:
 *
 *   legacy SBU vocabulary  →  canonical capability code
 *
 * Direction is legacy→canonical ONLY (mandate §25): legacy vocabulary must
 * never become the canonical model again. Note the deliberate mapping of
 * legacy 'clearances' → canonical CUSTOMS (the registry prevents further
 * conflation of Capability with SBU).
 */

import type { CapabilityCode } from './types';
import type { SbuType } from '@/lib/application/identity/types';

const LEGACY_SBU_TO_CAPABILITY: Record<SbuType, CapabilityCode> = {
  trucking: 'TRUCKING',
  warehouse: 'WAREHOUSE',
  clearances: 'CUSTOMS',
  forwarding: 'FORWARDING',
};

/**
 * Map a legacy SBU type to its canonical capability code.
 * Returns null for unknown legacy values — never guesses.
 */
export function capabilityFromLegacySbu(sbuType: string | null | undefined): CapabilityCode | null {
  if (!sbuType) return null;
  return LEGACY_SBU_TO_CAPABILITY[sbuType as SbuType] ?? null;
}

/** All known legacy SBU types accepted by this adapter. */
export const KNOWN_LEGACY_SBU_TYPES: readonly string[] = Object.keys(LEGACY_SBU_TO_CAPABILITY);
