/**
 * lib/application/identity/index.ts
 *
 * Barrel export for the identity resolver module.
 * U-01: Core identity context, resolver, guards.
 * U-02: Role vocabulary, permission matrix, authorization gates.
 */

// --- Types ---
export type { IdentityContext, IdentityPermission, SbuType, StaffMembership, OwnedTenant } from './types';

// --- Errors ---
export { IdentityResolutionError, ERR_UNAUTHENTICATED, ERR_NO_TENANT_MEMBERSHIP, ERR_TENANT_MISMATCH, ERR_FORBIDDEN_PERMISSION } from './errors';
export type { IdentityErrorCode } from './errors';

// --- Role vocabulary ---
export {
  normalizeLegacyRole, isOwnerRole, isHqRole, isSbuRole, isTenantAdminRole, isGlobalRole, isOperationalRole,
  sbuTypeFromRole, sbuRoleLevel, LEGACY_ROLES, ALL_SBU_TYPES,
  ROLE_OWNER, ROLE_TENANT_SUPERADMIN, ROLE_TENANT_ADMIN,
  ROLE_HQ_COMMERCIAL_DIRECTOR, ROLE_HQ_SALES_MANAGER, ROLE_HQ_SALES_STAFF,
  ROLE_HQ_PRICING_ANALYST, ROLE_HQ_MARKETING_STAFF,
  ROLE_HQ_DIRECTOR_OPS, ROLE_HQ_DIRECTOR_FIN, ROLE_HQ_DIRECTOR_COMM,
  ROLE_HQ_DIRECTOR_BIZDEV, ROLE_HQ_DIRECTOR_HRD, ROLE_HQ_DIRECTOR_CS,
  ROLE_HQ_OPS, ROLE_HQ_CS, ROLE_HQ_FINANCE,
  ROLE_SBU_MANAGER_TR, ROLE_SBU_OPS_TR, ROLE_SBU_FIN_TR,
  ROLE_SBU_MANAGER_WH, ROLE_SBU_OPS_WH, ROLE_SBU_FIN_WH, ROLE_SBU_ADMIN_WH,
  ROLE_SBU_MANAGER_CL, ROLE_SBU_OPS_CL, ROLE_SBU_FIN_CL,
  ROLE_SBU_MANAGER_FWD, ROLE_SBU_OPS_FWD, ROLE_SBU_FIN_FWD,
  ROLE_DRIVER, ROLE_GROUND_STAFF, ROLE_WAREHOUSE_CUSTOMER,
} from './roles';
export type { SbuRoleLevel } from './roles';

// --- Authorization (permission matrix + gates) ---
export { resolvePermissionsForRole } from './authorization';
export { assertAnyPermission, assertAllPermissions, assertRole, assertSbuAccess, assertAuthorized } from './authorization';

// --- Membership source ---
export type { IdentityMembershipSource } from './membership-source';
export { resolveFromArrays } from './membership-source';

// --- Resolver + legacy guards (re-exported for backward compat) ---
export { resolveIdentityContext, assertPermission, assertTenantScope } from './resolver';
export type { ResolveIdentityInput } from './resolver';
