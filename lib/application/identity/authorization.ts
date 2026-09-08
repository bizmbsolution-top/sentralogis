/**
 * Sentralogis — Phase 4B-1a / U-02
 * lib/application/identity/authorization.ts
 *
 * Permission vocabulary, role→permission matrix, and authorization gate functions.
 *
 * PRINCIPLES:
 *   1. Role → Permission mapping is centralized here (single source of truth).
 *   2. Business code asserts PERMISSIONS, not raw role strings.
 *   3. Permissions are domain-neutral where possible (survives legacy→canonical transition).
 *   4. Scope (tenant/SBU/object) is a separate concern resolved by the IdentityContext.
 *   5. Legacy role normalization happens before permission resolution.
 */

import type { IdentityContext, IdentityPermission, SbuType } from './types';
import type { IdentityErrorCode } from './errors';
import { IdentityResolutionError, ERR_FORBIDDEN_PERMISSION } from './errors';
import {
  normalizeLegacyRole,
  isOwnerRole,
  isGlobalRole,
  isHqRole,
  isSbuRole,
  isTenantAdminRole,
  sbuTypeFromRole,
  ROLE_OWNER,
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_DRIVER,
  ROLE_GROUND_STAFF,
  ROLE_WAREHOUSE_CUSTOMER,
  ROLE_HQ_COMMERCIAL_DIRECTOR,
  ROLE_HQ_DIRECTOR_OPS,
  ROLE_HQ_DIRECTOR_FIN,
  ROLE_HQ_DIRECTOR_COMM,
  ROLE_HQ_DIRECTOR_BIZDEV,
  ROLE_HQ_DIRECTOR_HRD,
  ROLE_HQ_DIRECTOR_CS,
  ROLE_HQ_SALES_MANAGER,
  ROLE_HQ_SALES_STAFF,
  ROLE_HQ_PRICING_ANALYST,
  ROLE_HQ_MARKETING_STAFF,
  ROLE_HQ_OPS,
  ROLE_HQ_CS,
  ROLE_HQ_FINANCE,
  ROLE_SBU_MANAGER_TR,
  ROLE_SBU_OPS_TR,
  ROLE_SBU_FIN_TR,
  ROLE_SBU_MANAGER_WH,
  ROLE_SBU_OPS_WH,
  ROLE_SBU_FIN_WH,
  ROLE_SBU_ADMIN_WH,
  ROLE_SBU_MANAGER_CL,
  ROLE_SBU_OPS_CL,
  ROLE_SBU_FIN_CL,
  ROLE_SBU_MANAGER_FWD,
  ROLE_SBU_OPS_FWD,
  ROLE_SBU_FIN_FWD,
} from './roles';

/* ================================================================== */
/*  PERMISSION VOCABULARY                                              */
/* ================================================================== */

/**
 * Complete permission vocabulary.
 * Format: `domain:action` — domain-neutral, survives legacy→canonical transition.
 *
 * Each permission corresponds to a REAL authorization decision in the current codebase.
 * Permissions are NOT invented to fill a matrix.
 */
export type Permission =
  // Commercial / Work Orders
  | 'commercial:read'
  | 'commercial:manage'
  // Work Orders (legacy operational)
  | 'work_order:read'
  | 'work_order:create'
  | 'work_order:update'
  | 'work_order:approve'
  // Job Orders (execution)
  | 'job_order:read'
  | 'job_order:create'
  | 'job_order:assign'
  | 'job_order:update'
  | 'job_order:complete'
  // Shipment (forwarding)
  | 'shipment:read'
  | 'shipment:manage'
  // Customs
  | 'customs:read'
  | 'customs:manage'
  // Warehouse
  | 'warehouse:read'
  | 'warehouse:manage'
  // Finance
  | 'finance:read'
  | 'finance:manage'
  // Fleet / Resources
  | 'fleet:read'
  | 'fleet:manage'
  // Customer visibility
  | 'customer_visibility:read'
  // Intelligence / reporting
  | 'intelligence:read'
  // Staff administration (tenant-level)
  | 'staff:manage'
  // Tenant configuration
  | 'tenant:manage'
  // Pricing override governance (ADR-063)
  | 'pricing:override'
  | 'pricing:approve'
  | 'pricing:read';

/* ================================================================== */
/*  ROLE → PERMISSION MATRIX                                           */
/* ================================================================== */

/**
 * Centralized permission mapping.
 *
 * Each role maps to its set of granted permissions.
 * The resolver normalizes legacy roles BEFORE consulting this matrix.
 *
 * SCOPE NOTES:
 * - Tenant Admin/Superadmin: tenant-wide scope on all domains.
 * - HQ Directors: tenant-wide read + domain-specific manage.
 * - HQ Commercial: commercial domain manage.
 * - HQ Ops/CS: operational domain read, WO create/update.
 * - HQ Finance: finance read/manage.
 * - SBU Manager: SBU-scoped manage on their domain.
 * - SBU Ops: SBU-scoped read + limited create/update.
 * - SBU Fin: SBU-scoped finance read/manage.
 * - Driver: own execution only (object scope, not tenant scope).
 * - Ground Staff: limited operational read.
 */
const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {

  /* ---- Platform ---- */
   [ROLE_OWNER]: [
     'commercial:read', 'commercial:manage',
     'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
     'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update', 'job_order:complete',
     'shipment:read', 'shipment:manage',
     'customs:read', 'customs:manage',
     'warehouse:read', 'warehouse:manage',
     'finance:read', 'finance:manage',
     'fleet:read', 'fleet:manage',
     'customer_visibility:read',
     'intelligence:read',
     'staff:manage',
     'tenant:manage',
     'pricing:override', 'pricing:approve',
   ],

  /* ---- Tenant owner branch (resolver sets 'TENANT_OWNER' role) ---- */
  'TENANT_OWNER': [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
    'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update', 'job_order:complete',
    'shipment:read', 'shipment:manage',
    'customs:read', 'customs:manage',
    'warehouse:read', 'warehouse:manage',
    'finance:read', 'finance:manage',
    'fleet:read', 'fleet:manage',
    'customer_visibility:read',
    'intelligence:read',
    'staff:manage',
    'tenant:manage',
  ],

  /* ---- Tenant Admin ---- */
  [ROLE_TENANT_SUPERADMIN]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
    'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update', 'job_order:complete',
    'shipment:read', 'shipment:manage',
    'customs:read', 'customs:manage',
    'warehouse:read', 'warehouse:manage',
    'finance:read', 'finance:manage',
    'fleet:read', 'fleet:manage',
    'customer_visibility:read',
    'intelligence:read',
    'staff:manage',
  ],

  [ROLE_TENANT_ADMIN]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
    'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update', 'job_order:complete',
    'shipment:read', 'shipment:manage',
    'customs:read', 'customs:manage',
    'warehouse:read', 'warehouse:manage',
    'finance:read', 'finance:manage',
    'fleet:read', 'fleet:manage',
    'customer_visibility:read',
    'intelligence:read',
    'staff:manage',
  ],

  /* ---- HQ Directors ---- */
  [ROLE_HQ_DIRECTOR_OPS]: [
    'commercial:read',
    'work_order:read', 'work_order:update', 'work_order:approve',
    'job_order:read', 'job_order:assign', 'job_order:update',
    'shipment:read',
    'customs:read',
    'warehouse:read',
    'fleet:read', 'fleet:manage',
    'intelligence:read',
  ],

  [ROLE_HQ_DIRECTOR_FIN]: [
    'commercial:read',
    'work_order:read',
    'job_order:read',
    'shipment:read',
    'customs:read',
    'warehouse:read',
    'finance:read', 'finance:manage',
    'intelligence:read',
  ],

  [ROLE_HQ_DIRECTOR_COMM]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
    'shipment:read', 'shipment:manage',
    'customer_visibility:read',
    'intelligence:read',
  ],

  [ROLE_HQ_DIRECTOR_BIZDEV]: [
    'commercial:read',
    'work_order:read',
    'customer_visibility:read',
    'intelligence:read',
  ],

  [ROLE_HQ_DIRECTOR_HRD]: [
    'staff:manage',
    'intelligence:read',
  ],

  [ROLE_HQ_DIRECTOR_CS]: [
    'commercial:read',
    'work_order:read', 'work_order:update',
    'job_order:read',
    'customer_visibility:read',
    'intelligence:read',
  ],

  /* ---- HQ Commercial ---- */
  [ROLE_HQ_COMMERCIAL_DIRECTOR]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update', 'work_order:approve',
    'shipment:read', 'shipment:manage',
    'customer_visibility:read',
    'intelligence:read',
  ],

  [ROLE_HQ_SALES_MANAGER]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update',
    'customer_visibility:read',
    'intelligence:read',
  ],

  [ROLE_HQ_SALES_STAFF]: [
    'commercial:read', 'commercial:manage',
    'work_order:read', 'work_order:create', 'work_order:update',
    'customer_visibility:read',
  ],

  [ROLE_HQ_PRICING_ANALYST]: [
    'commercial:read', 'commercial:manage',
    'work_order:read',
    'finance:read',
    'intelligence:read',
  ],

  [ROLE_HQ_MARKETING_STAFF]: [
    'commercial:read',
    'customer_visibility:read',
    'intelligence:read',
  ],

  /* ---- HQ Operations / CS / Finance ---- */
  [ROLE_HQ_OPS]: [
    'work_order:read', 'work_order:create', 'work_order:update',
    'job_order:read', 'job_order:assign', 'job_order:update',
    'shipment:read',
    'customs:read',
    'warehouse:read',
    'fleet:read',
    'intelligence:read',
  ],

  [ROLE_HQ_CS]: [
    'work_order:read', 'work_order:update',
    'job_order:read',
    'customer_visibility:read',
  ],

  [ROLE_HQ_FINANCE]: [
    'work_order:read',
    'job_order:read',
    'finance:read', 'finance:manage',
    'intelligence:read',
  ],

  /* ---- SBU Trucking ---- */
  [ROLE_SBU_MANAGER_TR]: [
    'work_order:read', 'work_order:update',
    'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update', 'job_order:complete',
    'fleet:read', 'fleet:manage',
    'intelligence:read',
  ],

  [ROLE_SBU_OPS_TR]: [
    'work_order:read', 'work_order:update',
    'job_order:read', 'job_order:create', 'job_order:assign', 'job_order:update',
    'fleet:read',
  ],

  [ROLE_SBU_FIN_TR]: [
    'work_order:read',
    'job_order:read',
    'finance:read',
  ],

  /* ---- SBU Warehouse ---- */
  [ROLE_SBU_MANAGER_WH]: [
    'warehouse:read', 'warehouse:manage',
    'job_order:read', 'job_order:create', 'job_order:update',
    'intelligence:read',
  ],

  [ROLE_SBU_OPS_WH]: [
    'warehouse:read', 'warehouse:manage',
    'job_order:read', 'job_order:create', 'job_order:update',
  ],

  [ROLE_SBU_FIN_WH]: [
    'warehouse:read',
    'finance:read',
  ],

  [ROLE_SBU_ADMIN_WH]: [
    'warehouse:read', 'warehouse:manage',
    'job_order:read',
  ],

  /* ---- SBU Customs/Clearance ---- */
  [ROLE_SBU_MANAGER_CL]: [
    'customs:read', 'customs:manage',
    'work_order:read',
    'intelligence:read',
  ],

  [ROLE_SBU_OPS_CL]: [
    'customs:read', 'customs:manage',
    'work_order:read',
  ],

  [ROLE_SBU_FIN_CL]: [
    'customs:read',
    'finance:read',
  ],

  /* ---- SBU Forwarding ---- */
  [ROLE_SBU_MANAGER_FWD]: [
    'shipment:read', 'shipment:manage',
    'work_order:read', 'work_order:update',
    'intelligence:read',
  ],

  [ROLE_SBU_OPS_FWD]: [
    'shipment:read', 'shipment:manage',
    'work_order:read', 'work_order:update',
  ],

  [ROLE_SBU_FIN_FWD]: [
    'shipment:read',
    'finance:read',
  ],

  /* ---- Operational ---- */
  [ROLE_DRIVER]: [
    'job_order:read', 'job_order:update', 'job_order:complete',
  ],

  [ROLE_GROUND_STAFF]: [
    'warehouse:read',
    'job_order:read',
  ],

  [ROLE_WAREHOUSE_CUSTOMER]: [
    'customer_visibility:read',
  ],
};

/* ================================================================== */
/*  PERMISSION RESOLUTION                                              */
/* ================================================================== */

/**
 * Resolve the permission set for a normalized role code.
 * Legacy roles MUST be normalized via `normalizeLegacyRole()` before calling this.
 *
 * Returns a FROZEN array — callers must not mutate.
 */
export function resolvePermissionsForRole(normalizedRole: string): readonly Permission[] {
  return ROLE_PERMISSIONS[normalizedRole] ?? [];
}

/* ================================================================== */
/*  AUTHORIZATION GATE FUNCTIONS                                       */
/* ================================================================== */

/**
 * Assert the context carries at least one of the required permissions.
 * @throws {IdentityResolutionError} 403 when none of the permissions are present.
 */
export function assertAnyPermission(ctx: IdentityContext, ...permissions: Permission[]): void {
  const has = permissions.some(p => ctx.permissions.includes(p));
  if (!has) {
    throw ERR_FORBIDDEN_PERMISSION(permissions.join('|'));
  }
}

/**
 * Assert the context carries ALL of the required permissions.
 * @throws {IdentityResolutionError} 403 when any permission is missing.
 */
export function assertAllPermissions(ctx: IdentityContext, ...permissions: Permission[]): void {
  for (const p of permissions) {
    if (!ctx.permissions.includes(p)) {
      throw ERR_FORBIDDEN_PERMISSION(p);
    }
  }
}

/**
 * Assert the context's role is in a set of allowed roles.
 * This is a LAST RESORT — prefer assertPermission() for business authorization.
 * Use only when the operation is genuinely role-bound (e.g., only owners can manage tenant config).
 * @throws {IdentityResolutionError} 403 when role is not in allowed set.
 */
export function assertRole(ctx: IdentityContext, ...allowedRoles: string[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new IdentityResolutionError('FORBIDDEN_PERMISSION', 403, `Required role not met: ${allowedRoles.join('|')}.`);
  }
}

/**
 * Assert the context's SBU scope covers a required SBU type.
 * Returns silently for global roles (owner, HQ) who have tenant-wide scope.
 * @throws {IdentityResolutionError} 403 when SBU access is insufficient.
 */
export function assertSbuAccess(ctx: IdentityContext, requiredSbu: SbuType): void {
  // Global roles have tenant-wide scope.
  if (isGlobalRole(ctx.role) || isTenantAdminRole(ctx.role)) {
    return;
  }
  // SBU roles: check if their SBU matches.
  const ctxSbu = sbuTypeFromRole(ctx.role);
  if (ctxSbu === requiredSbu) {
    return;
  }
  // No match.
  throw new IdentityResolutionError(
    'FORBIDDEN_PERMISSION',
    403,
    `Insufficient SBU scope: requires ${requiredSbu}.`,
  );
}

/**
 * Combined gate: assert authenticated + permission + tenant scope.
 * This is the HIGH-LEVEL entry point for route-level authorization.
 *
 * Usage in route handlers:
 *   const ctx = resolveIdentityContext({ userId, source });
 *   assertAuthorized(ctx, 'work_order:create', TENANT_A);
 *
 * @throws {IdentityResolutionError} 401/403 on any failure.
 */
export function assertAuthorized(
  ctx: IdentityContext,
  permission: Permission,
  expectedTenantId: string,
): void {
  // Tenant scope (includes implicit authentication check — if ctx exists, user was authenticated)
  if (ctx.tenantId !== expectedTenantId) {
    throw new IdentityResolutionError('TENANT_MISMATCH', 403, 'Tenant scope violation.');
  }
  // Permission
  if (!ctx.permissions.includes(permission)) {
    throw ERR_FORBIDDEN_PERMISSION(permission);
  }
}
