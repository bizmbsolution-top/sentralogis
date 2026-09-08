/**
 * Sentralogis — Phase 4B-1a / U-02
 * lib/application/identity/roles.ts
 *
 * Canonical role vocabulary.
 * Derived from LIVE repository evidence: dashboardRoute.ts, roles.ts,
 * migrations 023/086/166, create-user route, tenant_roles table schema.
 *
 * PRINCIPLE: These are application-level constants only.
 * They do NOT replace the tenant_roles table (which remains authoritative in DB).
 * They provide the TypeScript vocabulary for server-side authorization gates.
 */

/* ------------------------------------------------------------------ */
/*  Platform-level role (owner branch of identity resolution)          */
/* ------------------------------------------------------------------ */

export const ROLE_OWNER = 'owner_sentralogis' as const;

/* ------------------------------------------------------------------ */
/*  Tenant-level roles                                                 */
/* ------------------------------------------------------------------ */

export const ROLE_TENANT_SUPERADMIN = 'tenant_superadmin' as const;
export const ROLE_TENANT_ADMIN = 'tenant_admin' as const;

/* ------------------------------------------------------------------ */
/*  HQ roles — directors                                               */
/* ------------------------------------------------------------------ */

export const ROLE_HQ_DIRECTOR_OPS = 'hq_director_ops' as const;
export const ROLE_HQ_DIRECTOR_FIN = 'hq_director_fin' as const;
export const ROLE_HQ_DIRECTOR_COMM = 'hq_director_comm' as const;
export const ROLE_HQ_DIRECTOR_BIZDEV = 'hq_director_bizdev' as const;
export const ROLE_HQ_DIRECTOR_HRD = 'hq_director_hrd' as const;
export const ROLE_HQ_DIRECTOR_CS = 'hq_director_cs' as const;

/* ------------------------------------------------------------------ */
/*  HQ roles — commercial / sales                                      */
/* ------------------------------------------------------------------ */

export const ROLE_HQ_COMMERCIAL_DIRECTOR = 'hq_commercial_director' as const;
export const ROLE_HQ_SALES_MANAGER = 'hq_sales_manager' as const;
export const ROLE_HQ_SALES_STAFF = 'hq_sales_staff' as const;
export const ROLE_HQ_PRICING_ANALYST = 'hq_pricing_analyst' as const;
export const ROLE_HQ_MARKETING_STAFF = 'hq_marketing_staff' as const;

/* ------------------------------------------------------------------ */
/*  HQ roles — operations / CS / finance                               */
/* ------------------------------------------------------------------ */

export const ROLE_HQ_OPS = 'hq_ops' as const;
export const ROLE_HQ_CS = 'hq_cs' as const;
export const ROLE_HQ_FINANCE = 'hq_finance' as const;

/* ------------------------------------------------------------------ */
/*  SBU roles — trucking                                               */
/* ------------------------------------------------------------------ */

export const ROLE_SBU_MANAGER_TR = 'sbu_manager_tr' as const;
export const ROLE_SBU_OPS_TR = 'sbu_ops_tr' as const;
export const ROLE_SBU_FIN_TR = 'sbu_fin_tr' as const;

/* ------------------------------------------------------------------ */
/*  SBU roles — warehouse                                              */
/* ------------------------------------------------------------------ */

export const ROLE_SBU_MANAGER_WH = 'sbu_manager_wh' as const;
export const ROLE_SBU_OPS_WH = 'sbu_ops_wh' as const;
export const ROLE_SBU_FIN_WH = 'sbu_fin_wh' as const;
export const ROLE_SBU_ADMIN_WH = 'sbu_admin_wh' as const;

/* ------------------------------------------------------------------ */
/*  SBU roles — customs/clearance                                      */
/* ------------------------------------------------------------------ */

export const ROLE_SBU_MANAGER_CL = 'sbu_manager_cl' as const;
export const ROLE_SBU_OPS_CL = 'sbu_ops_cl' as const;
export const ROLE_SBU_FIN_CL = 'sbu_fin_cl' as const;

/* ------------------------------------------------------------------ */
/*  SBU roles — forwarding                                             */
/* ------------------------------------------------------------------ */

export const ROLE_SBU_MANAGER_FWD = 'sbu_manager_fwd' as const;
export const ROLE_SBU_OPS_FWD = 'sbu_ops_fwd' as const;
export const ROLE_SBU_FIN_FWD = 'sbu_fin_fwd' as const;

/* ------------------------------------------------------------------ */
/*  Operational roles                                                  */
/* ------------------------------------------------------------------ */

export const ROLE_DRIVER = 'driver' as const;
export const ROLE_GROUND_STAFF = 'ground_staff' as const;
export const ROLE_WAREHOUSE_CUSTOMER = 'warehouse_customer' as const;

/* ------------------------------------------------------------------ */
/*  Legacy roles — still present in profiles.role / admin routes       */
/*  DEPRECATE these when migration allows.                             */
/* ------------------------------------------------------------------ */

export const ROLE_LEGACY_ADMIN = 'admin' as const;
export const ROLE_LEGACY_ADMIN_COMPANY = 'admin_company' as const;
export const ROLE_LEGACY_SUPERADMIN = 'superadmin' as const;
export const ROLE_LEGACY_VIEWER = 'viewer' as const;
export const ROLE_CS_TRUCKING = 'cs_trucking' as const;
export const ROLE_CS_CUSTOMS = 'cs_customs' as const;
export const ROLE_CS_FORWARDING = 'cs_forwarding' as const;

/* ------------------------------------------------------------------ */
/*  SBU type constants (from tenant_sbus.sbu_type)                     */
/* ------------------------------------------------------------------ */

export const SBU_TRUCKING = 'trucking' as const;
export const SBU_WAREHOUSE = 'warehouse' as const;
export const SBU_CUSTOMS = 'clearances' as const;
export const SBU_FORWARDING = 'forwarding' as const;

export type SbuType = typeof SBU_TRUCKING | typeof SBU_WAREHOUSE | typeof SBU_CUSTOMS | typeof SBU_FORWARDING;

export const ALL_SBU_TYPES: readonly SbuType[] = [SBU_TRUCKING, SBU_WAREHOUSE, SBU_CUSTOMS, SBU_FORWARDING];

/* ------------------------------------------------------------------ */
/*  Role category helpers                                              */
/* ------------------------------------------------------------------ */

/** Platform owner (single-tenant root). */
export function isOwnerRole(role: string): boolean {
  return role === ROLE_OWNER;
}

/** HQ-level roles (prefix hq_). */
export function isHqRole(role: string): boolean {
  return role.startsWith('hq_');
}

/** SBU-level roles (prefix sbu_). */
export function isSbuRole(role: string): boolean {
  return role.startsWith('sbu_');
}

/** Tenant-level admin roles. */
export function isTenantAdminRole(role: string): boolean {
  return role === ROLE_TENANT_SUPERADMIN || role === ROLE_TENANT_ADMIN;
}

/** Global role = owner or any HQ role (from existing roles.ts pattern). */
export function isGlobalRole(role: string): boolean {
  return isOwnerRole(role) || isHqRole(role);
}

/** Operational roles that execute work (driver, ground_staff). */
export function isOperationalRole(role: string): boolean {
  return role === ROLE_DRIVER || role === ROLE_GROUND_STAFF;
}

/**
 * Legacy role normalization.
 * Maps deprecated role strings to their canonical equivalents.
 * Returns the input unchanged if already canonical.
 *
 * IMPORTANT: This is a transitional translation — not a second auth system.
 * Callers must still resolve through the IdentityContext, never from raw strings.
 */
export function normalizeLegacyRole(role: string): string {
  switch (role) {
    // Legacy admin variants → tenant_superadmin
    case ROLE_LEGACY_ADMIN:
    case ROLE_LEGACY_ADMIN_COMPANY:
    case ROLE_LEGACY_SUPERADMIN:
      return ROLE_TENANT_SUPERADMIN;
    // Legacy viewer → tenant_admin (read-heavy but still tenant-level)
    case ROLE_LEGACY_VIEWER:
      return ROLE_TENANT_ADMIN;
    // CS roles → map to the corresponding SBU ops role
    case ROLE_CS_TRUCKING:
      return ROLE_SBU_OPS_TR;
    case ROLE_CS_CUSTOMS:
      return ROLE_SBU_OPS_CL;
    case ROLE_CS_FORWARDING:
      return ROLE_SBU_OPS_FWD;
    // Non-canonical legacy SBU role variants → canonical short codes
    case 'sbu_ops_trucking':
      return ROLE_SBU_OPS_TR;
    case 'sbu_ops_whse':
    case 'sbu_ops_warehouse':
      return 'sbu_ops_wh';
    case 'sbu_ops_clearance':
    case 'sbu_ops_customs':
      return ROLE_SBU_OPS_CL;
    case 'sbu_ops_forward':
      return ROLE_SBU_OPS_FWD;
    // Already canonical or unknown — pass through
    default:
      return role;
  }
}

/** All known legacy roles that require normalization. */
export const LEGACY_ROLES = new Set<string>([
  ROLE_LEGACY_ADMIN,
  ROLE_LEGACY_ADMIN_COMPANY,
  ROLE_LEGACY_SUPERADMIN,
  ROLE_LEGACY_VIEWER,
  ROLE_CS_TRUCKING,
  ROLE_CS_CUSTOMS,
  ROLE_CS_FORWARDING,
]);

/**
 * Determine SBU type from a role code.
 * Returns null for non-SBU roles.
 */
export function sbuTypeFromRole(role: string): SbuType | null {
  if (role.endsWith('_tr')) return SBU_TRUCKING;
  if (role.endsWith('_wh')) return SBU_WAREHOUSE;
  if (role.endsWith('_cl')) return SBU_CUSTOMS;
  if (role.endsWith('_fwd')) return SBU_FORWARDING;
  return null;
}

/**
 * Determine the operational role level from a role code.
 * Returns null for non-SBU roles.
 */
export type SbuRoleLevel = 'manager' | 'ops' | 'fin' | 'admin' | null;

export function sbuRoleLevel(role: string): SbuRoleLevel {
  if (role.includes('_manager_')) return 'manager';
  if (role.includes('_ops_')) return 'ops';
  if (role.includes('_fin_')) return 'fin';
  if (role.includes('_admin_')) return 'admin';
  return null;
}
