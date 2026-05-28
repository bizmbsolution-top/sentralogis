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
