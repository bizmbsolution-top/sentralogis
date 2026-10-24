/**
 * lib/application/identity/master-data-permissions.ts
 *
 * Master Data permission vocabulary and role grants.
 *
 * Granular, per-category permissions in the canonical `domain:action` style
 * (see authorization.ts). Evaluation helpers live in master-data-guard.ts;
 * the role→permission matrix in authorization.ts spreads the grants below so
 * there is ONE canonical permission system (no second authorization engine).
 *
 * Decision matrix (product decision):
 *  - Superadmin (tenant_superadmin): every category — read / write / delete.
 *  - Customer Service (hq_cs): ONLY customers, vendors, drivers, fleet,
 *    locations, taxes — read + write (create/update). No delete, no "other".
 *  - owner_sentralogis / tenant_admin / TENANT_OWNER: unchanged effective
 *    reach (they already administer master data) — full grant.
 *  - Every other role: NO change (see master-data-guard.ts → 'legacy').
 */

export const MASTER_DATA_CATEGORIES = [
  'customers',
  'vendors',
  'drivers',
  'fleet',
  'locations',
  'taxes',
  /** services, fleet types, trucking regions, products, categories, UoMs … */
  'other',
] as const;

export type MasterDataCategory = (typeof MASTER_DATA_CATEGORIES)[number];

/** The six categories Customer Service may manage. */
export const CS_MASTER_DATA_CATEGORIES: readonly MasterDataCategory[] = [
  'customers',
  'vendors',
  'drivers',
  'fleet',
  'locations',
  'taxes',
] as const;

export type MasterDataAction = 'read' | 'write' | 'delete';

export type MasterDataPermission = `master_data:${MasterDataCategory}:${MasterDataAction}`;

export function masterDataPermission(
  category: MasterDataCategory,
  action: MasterDataAction,
): MasterDataPermission {
  return `master_data:${category}:${action}`;
}

const ACTIONS_FULL: readonly MasterDataAction[] = ['read', 'write', 'delete'];
const ACTIONS_NO_DELETE: readonly MasterDataAction[] = ['read', 'write'];

function grants(
  categories: readonly MasterDataCategory[],
  actions: readonly MasterDataAction[],
): MasterDataPermission[] {
  return categories.flatMap((c) => actions.map((a) => masterDataPermission(c, a)));
}

/** Full grant: all categories, read/write/delete. */
export const MASTER_DATA_FULL_GRANT: readonly MasterDataPermission[] = grants(
  MASTER_DATA_CATEGORIES,
  ACTIONS_FULL,
);

/** Customer Service grant: six categories, read/write (create + update) only. */
export const MASTER_DATA_CS_GRANT: readonly MasterDataPermission[] = grants(
  CS_MASTER_DATA_CATEGORIES,
  ACTIONS_NO_DELETE,
);
