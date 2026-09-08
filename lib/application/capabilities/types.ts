/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/application/capabilities/types.ts
 *
 * Canonical capability registry contracts.
 *
 * The registry answers "WHAT capabilities exist" (global definitions).
 * It intentionally knows nothing about tenants, bindings, execution,
 * drivers, fleets, or jobs (mandate §20).
 */

/** Canonical capability codes — stable machine-readable business identity. */
export type CapabilityCode = 'CUSTOMS' | 'FORWARDING' | 'TRUCKING' | 'WAREHOUSE';

/** Definition-level lifecycle only. Deliberately minimal (§19). */
export type CapabilityStatus = 'ACTIVE' | 'INACTIVE';

export interface CanonicalCapability {
  code: CapabilityCode;
  name: string;
  description: string | null;
  status: CapabilityStatus;
  isSystem: boolean;
}

/** Deterministic domain error for all registry failures (§17). */
export type CapabilityErrorCode =
  | 'UNKNOWN_CAPABILITY'
  | 'INACTIVE_CAPABILITY'
  | 'UNAUTHENTICATED'
  | 'REPOSITORY_ERROR';

export class CapabilityRegistryError extends Error {
  constructor(
    public readonly code: CapabilityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CapabilityRegistryError';
  }
}
