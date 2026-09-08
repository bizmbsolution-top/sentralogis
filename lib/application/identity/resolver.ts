/**
 * Sentralogis — Phase 4B-1a / U-01 + U-02
 * lib/application/identity/resolver.ts
 *
 * Core identity resolver — the single entry point for establishing
 * a trusted server-side identity context.
 *
 * Resolution order (mirrors production get_my_tenant_id() semantics):
 *   1. Staff membership  (tenant_users WHERE user_id — at most 1 via UNIQUE)
 *   2. Owned tenant      (tenants WHERE user_id — owner branch)
 *   3. Neither           → NO_TENANT_MEMBERSHIP 403
 *
 * U-02 additions:
 *   - Legacy role normalization via normalizeLegacyRole()
 *   - Permission resolution via centralized matrix (authorization.ts)
 *   - SBU scope population from role code
 */

import type { IdentityContext, IdentityPermission, SbuType, StaffMembership, OwnedTenant } from './types';
import type { IdentityMembershipSource } from './membership-source';
import { ERR_UNAUTHENTICATED, ERR_NO_TENANT_MEMBERSHIP, ERR_TENANT_MISMATCH, ERR_FORBIDDEN_PERMISSION } from './errors';
import { normalizeLegacyRole, sbuTypeFromRole } from './roles';
import { resolvePermissionsForRole } from './authorization';

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ResolveIdentityInput {
  /** Authenticated user id (from supabase session). Null → unauthenticated. */
  userId?: string | null;
  /**
   * Optional tenant id supplied by the client (body / query / header).
   * NEVER treated as authoritative — only used as a *requested* context.
   */
  requestedTenantId?: string | null;
  /** Membership source — injected for testing; production code omits it. */
  source?: IdentityMembershipSource;
}

/**
 * Resolve the full identity context for an authenticated request.
 *
 * Synchronous — the source returns raw arrays (no DB calls needed in this unit;
 * production async wiring is deferred to Phase 4B-1b when routes consume this).
 *
 * U-02: Legacy roles are normalized before permission resolution.
 *
 * @throws {IdentityResolutionError} on unauthenticated / unauthorized access.
 */
export function resolveIdentityContext(
  input: ResolveIdentityInput,
): IdentityContext {
  /* ---- Gate 1: authentication ---- */
  if (!input.userId) {
    throw ERR_UNAUTHENTICATED();
  }
  const userId = input.userId;

  /* ---- Gate 2: membership / ownership resolution ---- */
  const source = input.source ?? throwNoSource();
  const staff: StaffMembership[] = source.getStaffMemberships(userId);
  const owned: OwnedTenant[] = source.getOwnedTenants(userId);

  if (staff.length === 0 && owned.length === 0) {
    throw ERR_NO_TENANT_MEMBERSHIP();
  }

  /* ---- Build authorized set ---- */
  const authorizedTenantIds = new Set<string>([
    ...staff.map((s: StaffMembership) => s.tenantId),
    ...owned.map((o: OwnedTenant) => o.tenantId),
  ]);

  /* ---- Active-tenant selection ---- */
  let activeTenantId: string;
  let activeMembershipId: string | null;
  let activeRole: string;
  let activeIsOwner: boolean;
  let activeTenantCode: string | null = null;

  // Staff branch takes precedence (mirrors COALESCE semantics).
  if (staff.length > 0) {
    const primary = staff[0]; // UNIQUE → at most 1
    activeTenantId = primary.tenantId;
    activeMembershipId = primary.membershipId;
    activeRole = primary.roleCode ?? 'MEMBER';
    activeIsOwner = owned.some((o: OwnedTenant) => o.tenantId === primary.tenantId);
    activeTenantCode = owned.find((o: OwnedTenant) => o.tenantId === primary.tenantId)?.tenantCode ?? null;
  } else {
    // Owner-only path.
    const primary = owned[0];
    activeTenantId = primary.tenantId;
    activeMembershipId = null;
    activeRole = 'TENANT_OWNER';
    activeIsOwner = true;
    activeTenantCode = primary.tenantCode ?? null;
  }

  /* ---- Gate 3: requested tenant validation ---- */
  const requestedTenantId = normalizeUuid(input.requestedTenantId);
  if (requestedTenantId) {
    if (!authorizedTenantIds.has(requestedTenantId)) {
      throw ERR_TENANT_MISMATCH();
    }
    // Switch active context to the requested tenant if it differs.
    if (requestedTenantId !== activeTenantId) {
      activeTenantId = requestedTenantId;
      const matchStaff = staff.find((s: StaffMembership) => s.tenantId === requestedTenantId);
      const matchOwned = owned.find((o: OwnedTenant) => o.tenantId === requestedTenantId);
      if (matchStaff) {
        activeMembershipId = matchStaff.membershipId;
        activeRole = matchStaff.roleCode ?? 'MEMBER';
        activeIsOwner = !!matchOwned;
        activeTenantCode = matchOwned?.tenantCode ?? null;
      } else if (matchOwned) {
        activeMembershipId = null;
        activeRole = 'TENANT_OWNER';
        activeIsOwner = true;
        activeTenantCode = matchOwned.tenantCode ?? null;
      }
    }
  }

  /* ---- U-02: Normalize legacy roles ---- */
  const normalizedRole = normalizeLegacyRole(activeRole);

  /* ---- U-02: Resolve permissions from centralized matrix ---- */
  const permissions = resolvePermissionsForRole(normalizedRole) as IdentityPermission[];

  /* ---- U-02: Determine SBU scope ---- */
  const sbuScope: SbuType | null = sbuTypeFromRole(normalizedRole);

  /* ---- Build context ---- */
  const ctx: IdentityContext = {
    userId,
    tenantId: activeTenantId,
    tenantCode: activeTenantCode,
    membershipId: activeMembershipId,
    role: normalizedRole,
    isTenantOwner: activeIsOwner,
    permissions,
    sbuScope,
  };

  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Guard helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Assert the context carries a required permission.
 * Call this BEFORE any privileged business operation.
 * @throws {IdentityResolutionError} 403 when permission is missing.
 */
export function assertPermission(ctx: IdentityContext, permission: IdentityPermission): void {
  if (!ctx.permissions.includes(permission)) {
    throw ERR_FORBIDDEN_PERMISSION(permission);
  }
}

/**
 * Assert that a data row's tenant matches the trusted identity context.
 * Use this in any privileged operation before issuing a privileged query.
 * @throws {IdentityResolutionError} 403 when tenants don't match.
 */
export function assertTenantScope(ctx: IdentityContext, rowTenantId: string): void {
  if (ctx.tenantId !== rowTenantId) {
    throw ERR_TENANT_MISMATCH();
  }
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

function normalizeUuid(v: string | null | undefined): string | null {
  if (!v || typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length < 1 || trimmed.length > 64) return null;
  return trimmed;
}

function throwNoSource(): never {
  throw new Error(
    'IDENTITY_RESOLVER_CONFIG: IdentityMembershipSource must be provided. ' +
    'In production use resolveFromArrays(); in tests inject a fixture.',
  );
}
