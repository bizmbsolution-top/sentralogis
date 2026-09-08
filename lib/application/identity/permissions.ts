/**
 * Sentralogis — Phase 4B-1a / U-01
 * lib/application/identity/permissions.ts
 *
 * Role → permission mapping for the commercial application boundary.
 * Roles mirror the LIVE vocabulary verified during Stage R discovery:
 *   tenant_users.role_code:  tenant_superadmin, hq_*, sbu_admin_*, sbu_manager_*,
 *                            sbu_ops_*, sbu_fin_*, fwd_staff, ink_staff, driver, …
 *   owner branch (tenants.user_id): role 'TENANT_OWNER'
 *
 * Principle: least privilege. Manage is deliberately narrow; extend the set only
 * with an explicit owner decision. Read is granted to any resolved member/owner.
 */

import type { IdentityPermission } from './types';

const COMMERCIAL_MANAGE_ROLES = new Set<string>([
  'TENANT_OWNER',
  'tenant_superadmin',
  'hq_commercial_director',
  'hq_director_comm',
]);

export function resolvePermissions(role: string): IdentityPermission[] {
  const permissions: IdentityPermission[] = ['commercial:read'];
  if (COMMERCIAL_MANAGE_ROLES.has(role)) {
    permissions.push('commercial:manage');
  }
  return permissions;
}
