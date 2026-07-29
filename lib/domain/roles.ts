export interface AuthProfileLike {
  role?: string | null;
  tenant_id?: string | null;
}

export function isOwnerRole(role: string | null | undefined): boolean {
  return role === 'owner_sentralogis';
}

export function isTenantSuperadmin(role: string | null | undefined): boolean {
  return role === 'tenant_superadmin';
}

export function isTenantAdminRole(role: string | null | undefined): boolean {
  return role === 'tenant_admin' || role === 'tenant_superadmin';
}

export function isGlobalRole(profile: AuthProfileLike): boolean {
  const role = profile.role || '';
  return isOwnerRole(role) || role.startsWith('hq_');
}

export function isStaffRole(profile: AuthProfileLike): boolean {
  const role = profile.role || '';
  return !!role && !isOwnerRole(role) && !isTenantSuperadmin(role);
}

export function isGroundStaffRole(role: string | null | undefined): boolean {
  return role === 'ground_staff';
}

export function getDashboardRoute(role: string | null | undefined): string {
  if (!role) return '/login';
  if (isOwnerRole(role)) return '/owner';
  if (role.startsWith('hq_')) return '/hq/ops-dashboard';
  if (isTenantSuperadmin(role)) return '/tenant';
  if (isTenantAdminRole(role)) return '/tenant';
  if (isGroundStaffRole(role)) return '/ground/dashboard';
  return '/login';
}
