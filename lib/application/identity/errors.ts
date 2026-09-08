/**
 * Sentralogis — Phase 4B-1a / U-01
 * lib/application/identity/errors.ts
 *
 * Error contract (mandate §19):
 *   401 = unauthenticated
 *   403 = authenticated but unauthorized (no membership / tenant mismatch)
 *   400 = malformed request (caller's responsibility, not produced here)
 * Error messages deliberately avoid revealing whether another tenant exists.
 */

export type IdentityErrorCode =
  | 'UNAUTHENTICATED'
  | 'NO_TENANT_MEMBERSHIP'
  | 'TENANT_MISMATCH'
  | 'FORBIDDEN_PERMISSION';

export class IdentityResolutionError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    public readonly statusCode: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = 'IdentityResolutionError';
  }
}

export const ERR_UNAUTHENTICATED = () =>
  new IdentityResolutionError('UNAUTHENTICATED', 401, 'Unauthenticated: no valid session.');

export const ERR_NO_TENANT_MEMBERSHIP = () =>
  new IdentityResolutionError(
    'NO_TENANT_MEMBERSHIP',
    403,
    'Authenticated identity has no authorized tenant membership.',
  );

export const ERR_TENANT_MISMATCH = () =>
  new IdentityResolutionError(
    'TENANT_MISMATCH',
    403,
    'Requested tenant is not authorized for this identity.',
  );

export const ERR_FORBIDDEN_PERMISSION = (permission: string) =>
  new IdentityResolutionError('FORBIDDEN_PERMISSION', 403, `Missing required permission: ${permission}.`);
