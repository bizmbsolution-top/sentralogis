/**
 * Sentralogis — Phase 4B-1a / U-01
 * lib/application/identity/membership-source.ts
 *
 * Membership source contract + production Supabase implementation.
 *
 * The live identity model (verified against production during Stage R):
 *   auth.users → profiles (id = auth.users.id, NO tenant column)
 *              → tenant_users (UNIQUE(user_id) ⇒ at most ONE staff membership;
 *                              tenant_id → tenants ON DELETE CASCADE)
 *   tenants.user_id → auth.users (nullable OWNER link)
 *
 * Production resolver get_my_tenant_id() resolves COALESCE(staff, owner).
 * This source mirrors exactly that semantics.
 *
 * NOTE: The source contract is synchronous here. When routes consume this
 * resolver (Phase 4B-1b), the production source will wrap supabaseAdmin
 * queries in the route handler and pass resolved arrays into the source.
 * This keeps the core resolver unit-testable without async wiring.
 */

import type { OwnedTenant, StaffMembership } from './types';

/**
 * Synchronous membership source contract.
 * For tests: implement directly with arrays.
 * For production: the route handler queries supabaseAdmin, then wraps
 * the results in a simple object implementing this interface.
 */
export interface IdentityMembershipSource {
  /** All staff memberships for a user. Live schema enforces ≤1 via UNIQUE(user_id). */
  getStaffMemberships(userId: string): StaffMembership[];
  /** Tenants owned by the user (tenants.user_id link). */
  getOwnedTenants(userId: string): OwnedTenant[];
}

/**
 * Production helper: wraps pre-resolved arrays in a membership source.
 * Call this in route handlers after querying supabaseAdmin.
 *
 * Example (route handler):
 *   const staffRows = await supabaseAdmin.from('tenant_users')...
 *   const ownedRows = await supabaseAdmin.from('tenants')...
 *   const source = resolveFromArrays(staffRows, ownedRows)
 *   const ctx = resolveIdentityContext({ userId, source })
 */
export function resolveFromArrays(
  staffRows: Array<{ id: string; tenant_id: string; role_code: string | null }>,
  ownedRows: Array<{ id: string; tenant_code: string | null }>,
): IdentityMembershipSource {
  const staff: StaffMembership[] = staffRows.map(r => ({
    membershipId: r.id,
    tenantId: r.tenant_id,
    roleCode: r.role_code,
  }));
  const owned: OwnedTenant[] = ownedRows.map(r => ({
    tenantId: r.id,
    tenantCode: r.tenant_code,
  }));
  return {
    getStaffMemberships: (_userId: string): StaffMembership[] => staff,
    getOwnedTenants: (_userId: string): OwnedTenant[] => owned,
  };
}
