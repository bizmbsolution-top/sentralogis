/**
 * Sentralogis — Phase 4B-3 / U-05
 * lib/domain/commercial/capability-code-source.ts
 *
 * Dependency-inversion seam: lets the domain layer validate capability codes
 * against an externally supplied authority (the U-05 application registry)
 * WITHOUT importing it (application → domain direction only).
 *
 * DEFAULT behavior is byte-for-byte identical to the previous hard-coded
 * four-type list, so all existing callers and tests are unaffected until the
 * registry module syncs itself in (loadRegistry() → setCapabilityCodeValidator).
 */

const DEFAULT_CAPABILITY_CODES: readonly string[] = ['CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE'];

export type CapabilityCodeValidator = (code: string) => boolean;

let _validator: CapabilityCodeValidator =
  (code: string) => DEFAULT_CAPABILITY_CODES.includes(String(code ?? '').trim().toUpperCase());

/**
 * Install a registry-backed validator. Pass null to restore the static
 * canonical default.
 */
export function setCapabilityCodeValidator(validator: CapabilityCodeValidator | null): void {
  _validator =
    validator ??
    ((code: string) => DEFAULT_CAPABILITY_CODES.includes(String(code ?? '').trim().toUpperCase()));
}

/** Validate a capability code against the currently installed authority. */
export function isValidCapabilityCode(code: string): boolean {
  return _validator(code);
}
