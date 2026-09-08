/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/application/capabilities/index.ts
 */

export type {
  CanonicalCapability,
  CapabilityCode,
  CapabilityStatus,
  CapabilityErrorCode,
} from './types';
export { CapabilityRegistryError } from './types';

export type { CapabilityRegistryRepository } from './repository';
export {
  supabaseCapabilityRegistryRepository,
  _setCapabilityRegistryRepository,
} from './repository';

export {
  CANONICAL_CAPABILITY_CODES,
  resolveCapability,
  listCapabilities,
  loadRegistry,
  isRegisteredCapability,
  _resetRegistryCache,
} from './registry';

export { capabilityFromLegacySbu, KNOWN_LEGACY_SBU_TYPES } from './sbu-adapter';
