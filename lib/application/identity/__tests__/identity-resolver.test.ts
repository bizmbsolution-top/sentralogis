/**
 * Sentralogis — Phase 4B-1a / U-01
 * Test Suite: Hardened Identity Resolver
 *
 * Scenarios:
 *  T1  Staff membership → valid context (active tenant from staff row)
 *  T2  Unauthenticated → 401
 *  T3  Tenant mismatch → 403
 *  T4  Forged requested tenant → rejected (no body trust leak)
 *  T5  Multi-tenant (owner + staff) → switch active on valid request
 *  T6  No membership → 403
 *  T7  Service-role scope assertion (assertTenantScope)
 *  T8  Permission gate: manage-granted vs. read-only role
 *  T9  Owner branch (no staff row) → TENANT_OWNER role
 * T10  Requested tenant same as active → idempotent
 * T11  assertPermission throws when missing
 * T12  Permissions: read always present, manage conditionally
 */

import type { IdentityMembershipSource } from '../membership-source';
import type { StaffMembership, OwnedTenant } from '../types';
import {
  resolveIdentityContext,
  assertPermission,
  assertTenantScope,
} from '../resolver';
import { IdentityResolutionError } from '../errors';

export function runIdentityResolverSuite(): { passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  function assertThrows(fn: () => unknown, code: string, testName: string) {
    try {
      fn();
      console.error(`[FAIL] ${testName} — expected ${code} but no error thrown`);
      failed++;
    } catch (err: unknown) {
      const match =
        err instanceof IdentityResolutionError && err.code === code;
      if (match) {
        console.log(`[PASS] ${testName}`);
        passed++;
      } else {
        const got = err instanceof Error ? err.message : String(err);
        console.error(`[FAIL] ${testName} — expected ${code}, got: ${got}`);
        failed++;
      }
    }
  }

  console.log('====================================================');
  console.log('RUNNING IDENTITY RESOLVER SUITE (U-01)');
  console.log('====================================================');

  // -------------------------------------------------------------------
  // Fixture: in-memory membership source
  // -------------------------------------------------------------------

  const TENANT_A = 'tenant-a-uuid';
  const TENANT_B = 'tenant-b-uuid';
  const TENANT_C = 'tenant-c-uuid'; // unauthorized tenant

  const USER_STAFF = 'user-staff-001';
  const USER_OWNER = 'user-owner-001';
  const USER_MULTI = 'user-multi-001'; // staff A + owner B
  const USER_NONE  = 'user-none-001';
  const USER_UNAUTH = null;

  class FakeSource implements IdentityMembershipSource {
    private staffMap: Map<string, StaffMembership[]> = new Map();
    private ownedMap: Map<string, OwnedTenant[]> = new Map();

    addStaff(userId: string, m: StaffMembership) {
      const arr = this.staffMap.get(userId) || [];
      arr.push(m);
      this.staffMap.set(userId, arr);
    }
    addOwned(userId: string, o: OwnedTenant) {
      const arr = this.ownedMap.get(userId) || [];
      arr.push(o);
      this.ownedMap.set(userId, arr);
    }

    getStaffMemberships(userId: string): StaffMembership[] {
      return this.staffMap.get(userId) || [];
    }
    getOwnedTenants(userId: string): OwnedTenant[] {
      return this.ownedMap.get(userId) || [];
    }
  }

  const src = new FakeSource();
  src.addStaff(USER_STAFF, { membershipId: 'm-staff-001', tenantId: TENANT_A, roleCode: 'hq_commercial_director' });
  src.addStaff(USER_MULTI, { membershipId: 'm-multi-001', tenantId: TENANT_A, roleCode: 'sbu_ops_trucking' });
  src.addOwned(USER_MULTI, { tenantId: TENANT_B, tenantCode: 'BETA' });
  src.addOwned(USER_OWNER, { tenantId: TENANT_B, tenantCode: 'GAMMA' });

  // -------------------------------------------------------------------
  // T1 — Staff membership → valid context
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_STAFF, source: src });
    assert(ctx.userId === USER_STAFF, 'T1 userId');
    assert(ctx.tenantId === TENANT_A, 'T1 tenantId from staff row');
    assert(ctx.membershipId === 'm-staff-001', 'T1 membershipId');
    assert(ctx.role === 'hq_commercial_director', 'T1 role from staff');
    assert(ctx.isTenantOwner === false, 'T1 staff is not owner');
    assert(ctx.permissions.includes('commercial:read'), 'T1 has commercial:read');
    assert(ctx.permissions.includes('commercial:manage'), 'T1 hq_commercial_director has commercial:manage');
  }

  // -------------------------------------------------------------------
  // T2 — Unauthenticated → 401
  // -------------------------------------------------------------------
  assertThrows(
    () => resolveIdentityContext({ userId: USER_UNAUTH, source: src }),
    'UNAUTHENTICATED',
    'T2 unauthenticated user → 401',
  );

  // -------------------------------------------------------------------
  // T3 — Tenant mismatch (request unauthorized tenant) → 403
  // -------------------------------------------------------------------
  assertThrows(
    () => resolveIdentityContext({ userId: USER_STAFF, requestedTenantId: TENANT_C, source: src }),
    'TENANT_MISMATCH',
    'T3 requested unauthorized tenant → 403',
  );

  // -------------------------------------------------------------------
  // T4 — Forged requested tenant (context of A, request B) → 403
  // -------------------------------------------------------------------
  assertThrows(
    () => resolveIdentityContext({ userId: USER_STAFF, requestedTenantId: TENANT_B, source: src }),
    'TENANT_MISMATCH',
    'T4 forged requested tenant (A staff, request B) → 403',
  );

  // -------------------------------------------------------------------
  // T5 — Multi-tenant: staff A + owner B → valid switch on request B
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_MULTI, requestedTenantId: TENANT_B, source: src });
    assert(ctx.tenantId === TENANT_B, 'T5 active tenant switched to B');
    assert(ctx.role === 'TENANT_OWNER', 'T5 owner role adopted');
    assert(ctx.isTenantOwner === true, 'T5 isTenantOwner flag set');
    assert(ctx.tenantCode === 'BETA', 'T5 tenantCode from owned map');
  }

  // T5b — same user, no request → staff tenant A wins
  {
    const ctx = resolveIdentityContext({ userId: USER_MULTI, source: src });
    assert(ctx.tenantId === TENANT_A, 'T5b staff tenant A is active default');
    assert(ctx.role === 'sbu_ops_tr', 'T5b staff role normalized to canonical');
    assert(ctx.membershipId === 'm-multi-001', 'T5b membershipId from staff row');
  }

  // -------------------------------------------------------------------
  // T6 — No membership → 403
  // -------------------------------------------------------------------
  assertThrows(
    () => resolveIdentityContext({ userId: USER_NONE, source: src }),
    'NO_TENANT_MEMBERSHIP',
    'T6 no membership → 403',
  );

  // -------------------------------------------------------------------
  // T7 — assertTenantScope: row tenant mismatch → 403
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_STAFF, source: src });
    assertTenantScope(ctx, TENANT_A); // should not throw
    assert(true, 'T7 assertTenantScope match does not throw');
    assertThrows(
      () => assertTenantScope(ctx, TENANT_B),
      'TENANT_MISMATCH',
      'T7 assertTenantScope row mismatch → 403',
    );
  }

  // -------------------------------------------------------------------
  // T8 — Permission gate: read-only role vs manage role
  // -------------------------------------------------------------------
  {
    const ctxRead = resolveIdentityContext({ userId: USER_MULTI, source: src });
    assert(ctxRead.permissions.includes('job_order:read'), 'T8 sbu_ops has job_order:read');
    assert(!ctxRead.permissions.includes('commercial:manage'), 'T8 sbu_ops lacks commercial:manage');
    assertThrows(
      () => assertPermission(ctxRead, 'commercial:manage'),
      'FORBIDDEN_PERMISSION',
      'T8 assertPermission commercial:manage on sbu_ops → 403',
    );
  }

  // -------------------------------------------------------------------
  // T9 — Owner branch (no staff row) → TENANT_OWNER role
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_OWNER, source: src });
    assert(ctx.tenantId === TENANT_B, 'T9 owner tenant from owned');
    assert(ctx.membershipId === null, 'T9 owner branch has no membershipId');
    assert(ctx.role === 'TENANT_OWNER', 'T9 TENANT_OWNER role');
    assert(ctx.isTenantOwner === true, 'T9 isTenantOwner');
    assert(ctx.permissions.includes('commercial:manage'), 'T9 owner gets commercial:manage');
  }

  // -------------------------------------------------------------------
  // T10 — Requested tenant same as active → idempotent
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_STAFF, requestedTenantId: TENANT_A, source: src });
    assert(ctx.tenantId === TENANT_A, 'T10 same-tenant request idempotent');
    assert(ctx.membershipId === 'm-staff-001', 'T10 membershipId unchanged');
  }

  // -------------------------------------------------------------------
  // T11 — assertPermission throws when missing
  // -------------------------------------------------------------------
  {
    const ctx = resolveIdentityContext({ userId: USER_STAFF, source: src }); // hq_commercial_director → manage
    assertPermission(ctx, 'commercial:read');
    assertPermission(ctx, 'commercial:manage');
    assert(true, 'T11 assertPermission no throw for granted permission');
  }

  // -------------------------------------------------------------------
  // T12 — Permissions: expanded vocabulary (U-02)
  // -------------------------------------------------------------------
  {
    const ctxOps = resolveIdentityContext({ userId: USER_MULTI, source: src });
    assert(ctxOps.permissions.length > 0, 'T12 sbu_ops has non-empty permissions');
    assert(ctxOps.permissions.includes('job_order:read'), 'T12 sbu_ops has job_order:read');
    assert(!ctxOps.permissions.includes('commercial:manage'), 'T12 sbu_ops no commercial:manage');

    const ctxDir = resolveIdentityContext({ userId: USER_STAFF, source: src });
    assert(ctxDir.permissions.length > 2, 'T12 director has expanded permissions (U-02)');
    assert(ctxDir.permissions.includes('commercial:manage'), 'T12 director has commercial:manage');
  }

  // -------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------

  console.log('====================================================');
  console.log(`IDENTITY RESOLVER SUITE: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('====================================================');

  return { passed, failed, total: passed + failed };
}
