/**
 * lib/application/identity/master-data-guard.ts
 *
 * PURE (client + server safe) Master Data access evaluation built on the
 * canonical permission matrix (authorization.ts). No I/O here.
 *
 * Access modes:
 *  - 'matrix': role is governed by the explicit Master Data grants
 *    (owner_sentralogis, TENANT_OWNER, tenant_superadmin, tenant_admin, hq_cs).
 *    Anything not granted is DENIED.
 *  - 'legacy': every other role. Their pre-existing behaviour is intentionally
 *    UNCHANGED by this module (no new access, no new restriction). Master Data
 *    menu items stay hidden for them; direct URL behaviour is as before.
 *    Tightening this default is a separate policy decision.
 */

import {
  normalizeLegacyRole,
  ROLE_OWNER,
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_HQ_CS,
} from './roles';
import { resolvePermissionsForRole } from './authorization';
import { ERR_FORBIDDEN_PERMISSION } from './errors';
import {
  masterDataPermission,
  type MasterDataAction,
  type MasterDataCategory,
} from './master-data-permissions';

export type MasterDataAccessMode = 'matrix' | 'legacy';

const MATRIX_GOVERNED_ROLES: ReadonlySet<string> = new Set([
  ROLE_OWNER,
  'TENANT_OWNER',
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_HQ_CS,
]);

/** Tenant-level administration (Users, Tenant/System Settings): never CS. */
const ADMIN_SETTINGS_ROLES: ReadonlySet<string> = new Set([
  ROLE_OWNER,
  'TENANT_OWNER',
  ROLE_TENANT_SUPERADMIN,
  ROLE_TENANT_ADMIN,
]);

function norm(role: string | null | undefined): string {
  if (!role) return '';
  const raw = role.trim();
  return normalizeLegacyRole(raw === 'TENANT_OWNER' ? raw : raw.toLowerCase());
}

export function getMasterDataAccessMode(role: string | null | undefined): MasterDataAccessMode {
  return MATRIX_GOVERNED_ROLES.has(norm(role)) ? 'matrix' : 'legacy';
}

/** Can this role perform `action` on a Master Data `category`? */
export function canAccessMasterData(
  role: string | null | undefined,
  category: MasterDataCategory,
  action: MasterDataAction = 'read',
): boolean {
  const r = norm(role);
  if (!r) return false;
  if (!MATRIX_GOVERNED_ROLES.has(r)) return true; // 'legacy' — unchanged
  return resolvePermissionsForRole(r).includes(masterDataPermission(category, action));
}

/** True when the role may perform `action` on at least one of `categories`. */
export function canAccessAnyMasterData(
  role: string | null | undefined,
  categories: readonly MasterDataCategory[],
  action: MasterDataAction = 'read',
): boolean {
  return categories.some((c) => canAccessMasterData(role, c, action));
}

/** Users & Roles / Tenant Settings / System Settings visibility. CS is excluded. */
export function canSeeAdminSettings(role: string | null | undefined): boolean {
  return ADMIN_SETTINGS_ROLES.has(norm(role));
}

/**
 * Route → category map for Master Data surfaces (first match wins).
 * A route listing several categories is allowed when ANY is granted
 * (e.g. the contacts page manages both customers and vendors).
 */
export const MASTER_DATA_ROUTES: ReadonlyArray<{
  prefix: string;
  categories: readonly MasterDataCategory[];
}> = [
  { prefix: '/tenant/master/contacts', categories: ['customers', 'vendors'] },
  { prefix: '/hq/master/contacts', categories: ['customers', 'vendors'] },
  { prefix: '/hq/master/drivers', categories: ['drivers'] },
  { prefix: '/hq/master/fleets', categories: ['fleet'] },
  { prefix: '/hq/master/locations', categories: ['locations'] },
  { prefix: '/hq/finance/tax-management', categories: ['taxes'] },
  { prefix: '/hq/master/services', categories: ['other'] },
  { prefix: '/hq/master/fleet-types', categories: ['other'] },
  { prefix: '/hq/master/trucking-regions', categories: ['other'] },
  { prefix: '/hq/master-data', categories: ['other'] },
  { prefix: '/tenant/master/drivers', categories: ['drivers'] },
  { prefix: '/tenant/master/fleets', categories: ['fleet'] },
  { prefix: '/tenant/master/locations', categories: ['locations'] },
  { prefix: '/tenant/master/transporters', categories: ['vendors'] },
  { prefix: '/tenant/master/fleet-types', categories: ['other'] },
  { prefix: '/tenant/master/trucking-regions', categories: ['other'] },
  { prefix: '/tenant/master/driver-allowances', categories: ['other'] },
  { prefix: '/owner/master/contacts', categories: ['customers', 'vendors'] },
  { prefix: '/owner/master/drivers', categories: ['drivers'] },
  { prefix: '/owner/master/fleets', categories: ['fleet'] },
  { prefix: '/owner/master/transporters', categories: ['vendors'] },
  { prefix: '/owner/master/fleet-types', categories: ['other'] },
  { prefix: '/master/locations', categories: ['locations'] },
];

export function masterDataCategoriesForPath(
  pathname: string,
): readonly MasterDataCategory[] | null {
  for (const r of MASTER_DATA_ROUTES) {
    if (pathname === r.prefix || pathname.startsWith(r.prefix + '/')) return r.categories;
  }
  return null;
}

/**
 * Throwing gate for server actions / handlers that already hold a trusted
 * IdentityContext. Allowed when the role may perform ction on ANY of categories.
 * @throws {IdentityResolutionError} 403
 */
export function assertMasterDataAccess(
  ctx: { role: string },
  categories: readonly MasterDataCategory[],
  action: MasterDataAction = 'read',
): void {
  if (!canAccessAnyMasterData(ctx.role, categories, action)) {
    throw ERR_FORBIDDEN_PERMISSION(categories.map((c) => masterDataPermission(c, action)).join('|'));
  }
}
