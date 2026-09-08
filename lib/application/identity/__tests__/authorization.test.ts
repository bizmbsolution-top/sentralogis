/**
 * Sentralogis — Phase 4B-1a / U-02
 * Test Suite: Role Gate Vocabulary Extension
 *
 * Scenarios:
 *  T1  Legacy role normalization: admin → tenant_superadmin
 *  T2  Legacy role normalization: cs_trucking → sbu_ops_tr
 *  T3  Legacy role normalization: superadmin → tenant_superadmin
 *  T4  Legacy role normalization: viewer → tenant_admin
 *  T5  Canonical roles pass through unchanged
 *  T6  Role category helpers: isGlobalRole, isHqRole, isSbuRole
 *  T7  SBU type extraction from role code
 *  T8  SBU role level extraction (manager/ops/fin/admin)
 *  T9  Permission mapping: owner gets ALL permissions
 * T10  Permission mapping: tenant_superadmin gets all except tenant:manage
 * T11  Permission mapping: hq_commercial_director gets commercial:manage
 * T12  Permission mapping: sbu_ops_tr gets job_order:create but NOT finance:manage
 * T13  Permission mapping: driver gets only job_order read/update/complete
 * T14  Permission mapping: unknown role gets EMPTY permission set
 * T15  assertAnyPermission: matches one of many
 * T16  assertAnyPermission: denies when none match
 * T17  assertAllPermissions: allows when all present
 * T18  assertAllPermissions: denies when one missing
 * T19  assertRole: allows matching role
 * T20  assertRole: denies non-matching role
 * T21  assertSbuAccess: global role passes for any SBU
 * T22  assertSbuAccess: SBU role passes for matching SBU
 * T23  assertSbuAccess: SBU role denied for wrong SBU
 * T24  assertAuthorized: combined permission + tenant scope
 * T25  assertAuthorized: denies on tenant mismatch even if permission present
 * T26  assertAuthorized: denies on missing permission even if tenant matches
 * T27  Resolver integration: legacy admin resolves to tenant_superadmin permissions
 * T28  Resolver integration: sbu_ops_tr resolves to correct SBU scope
 * T29  Resolver integration: owner resolves with sbuScope=null
 * T30  U-01 regression: all 36 original tests still pass (via run-tests.ts harness)
 */

import type { IdentityMembershipSource } from '../membership-source';
import type { IdentityContext, SbuType, StaffMembership, OwnedTenant } from '../types';
import {
  resolveIdentityContext,
  assertPermission,
  assertTenantScope,
} from '../resolver';
import { IdentityResolutionError } from '../errors';
import {
  normalizeLegacyRole,
  isOwnerRole,
  isHqRole,
  isSbuRole,
  isTenantAdminRole,
  isGlobalRole,
  sbuTypeFromRole,
  sbuRoleLevel,
  LEGACY_ROLES,
  ROLE_OWNER,
  ROLE_TENANT_SUPERADMIN,
  ROLE_HQ_COMMERCIAL_DIRECTOR,
  ROLE_SBU_OPS_TR,
  ROLE_SBU_MANAGER_CL,
  ROLE_DRIVER,
  ROLE_LEGACY_ADMIN,
  ROLE_CS_TRUCKING,
} from '../roles';
import {
  resolvePermissionsForRole,
  assertAnyPermission,
  assertAllPermissions,
  assertRole,
  assertSbuAccess,
  assertAuthorized,
} from '../authorization';
import type { Permission } from '../authorization';

export function runAuthorizationSuite(): { passed: number; failed: number; total: number } {
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
      const match = err instanceof IdentityResolutionError && err.code === code;
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
  console.log('RUNNING AUTHORIZATION GATE SUITE (U-02)');
  console.log('====================================================');

  // -------------------------------------------------------------------
  // T1–T5: Legacy role normalization
  // -------------------------------------------------------------------
  assert(normalizeLegacyRole(ROLE_LEGACY_ADMIN) === ROLE_TENANT_SUPERADMIN, 'T1 admin → tenant_superadmin');
  assert(normalizeLegacyRole(ROLE_CS_TRUCKING) === 'sbu_ops_tr', 'T2 cs_trucking → sbu_ops_tr');
  assert(normalizeLegacyRole('superadmin') === ROLE_TENANT_SUPERADMIN, 'T3 superadmin → tenant_superadmin');
  assert(normalizeLegacyRole('viewer') === 'tenant_admin', 'T4 viewer → tenant_admin');
  assert(normalizeLegacyRole(ROLE_HQ_COMMERCIAL_DIRECTOR) === ROLE_HQ_COMMERCIAL_DIRECTOR, 'T5 canonical pass-through');
  assert(normalizeLegacyRole(ROLE_DRIVER) === ROLE_DRIVER, 'T5 driver pass-through');
  assert(LEGACY_ROLES.has(ROLE_LEGACY_ADMIN), 'T5 LEGACY_ROLES set contains admin');
  assert(!LEGACY_ROLES.has(ROLE_HQ_COMMERCIAL_DIRECTOR), 'T5 LEGACY_ROLES does not contain canonical');

  // -------------------------------------------------------------------
  // T6: Role category helpers
  // -------------------------------------------------------------------
  assert(isOwnerRole(ROLE_OWNER), 'T6 isOwnerRole(owner)');
  assert(!isOwnerRole(ROLE_TENANT_SUPERADMIN), 'T6 !isOwnerRole(superadmin)');
  assert(isHqRole(ROLE_HQ_COMMERCIAL_DIRECTOR), 'T6 isHqRole(hq_commercial_director)');
  assert(!isHqRole(ROLE_SBU_OPS_TR), 'T6 !isHqRole(sbu_ops_tr)');
  assert(isSbuRole(ROLE_SBU_OPS_TR), 'T6 isSbuRole(sbu_ops_tr)');
  assert(!isSbuRole(ROLE_HQ_COMMERCIAL_DIRECTOR), 'T6 !isSbuRole(hq_...)');
  assert(isTenantAdminRole(ROLE_TENANT_SUPERADMIN), 'T6 isTenantAdminRole(superadmin)');
  assert(isTenantAdminRole('tenant_admin'), 'T6 isTenantAdminRole(tenant_admin)');
  assert(isGlobalRole(ROLE_OWNER), 'T6 isGlobalRole(owner)');
  assert(isGlobalRole(ROLE_HQ_COMMERCIAL_DIRECTOR), 'T6 isGlobalRole(hq_...)');
  assert(!isGlobalRole(ROLE_SBU_OPS_TR), 'T6 !isGlobalRole(sbu_...)');

  // -------------------------------------------------------------------
  // T7: SBU type extraction
  // -------------------------------------------------------------------
  assert(sbuTypeFromRole(ROLE_SBU_OPS_TR) === 'trucking', 'T7 sbu_ops_tr → trucking');
  assert(sbuTypeFromRole(ROLE_SBU_MANAGER_CL) === 'clearances', 'T7 sbu_manager_cl → clearances');
  assert(sbuTypeFromRole('sbu_ops_wh') === 'warehouse', 'T7 sbu_ops_wh → warehouse');
  assert(sbuTypeFromRole('sbu_fin_fwd') === 'forwarding', 'T7 sbu_fin_fwd → forwarding');
  assert(sbuTypeFromRole(ROLE_HQ_COMMERCIAL_DIRECTOR) === null, 'T7 hq role → null');

  // -------------------------------------------------------------------
  // T8: SBU role level
  // -------------------------------------------------------------------
  assert(sbuRoleLevel('sbu_manager_tr') === 'manager', 'T8 manager');
  assert(sbuRoleLevel(ROLE_SBU_OPS_TR) === 'ops', 'T8 ops');
  assert(sbuRoleLevel('sbu_fin_tr') === 'fin', 'T8 fin');
  assert(sbuRoleLevel('sbu_admin_wh') === 'admin', 'T8 admin');
  assert(sbuRoleLevel(ROLE_HQ_COMMERCIAL_DIRECTOR) === null, 'T8 non-SBU → null');

  // -------------------------------------------------------------------
  // T9–T14: Permission mapping
  // -------------------------------------------------------------------
  const ownerPerms = resolvePermissionsForRole(ROLE_OWNER);
  assert(ownerPerms.includes('tenant:manage'), 'T9 owner has tenant:manage');
  assert(ownerPerms.includes('commercial:manage'), 'T9 owner has commercial:manage');
  assert(ownerPerms.includes('finance:manage'), 'T9 owner has finance:manage');
  assert(ownerPerms.includes('staff:manage'), 'T9 owner has staff:manage');

  const superadminPerms = resolvePermissionsForRole(ROLE_TENANT_SUPERADMIN);
  assert(superadminPerms.includes('tenant:manage') === false, 'T10 superadmin lacks tenant:manage');
  assert(superadminPerms.includes('commercial:manage'), 'T10 superadmin has commercial:manage');
  assert(superadminPerms.includes('staff:manage'), 'T10 superadmin has staff:manage');

  const commDirPerms = resolvePermissionsForRole(ROLE_HQ_COMMERCIAL_DIRECTOR);
  assert(commDirPerms.includes('commercial:manage'), 'T11 hq_commercial_director has commercial:manage');
  assert(commDirPerms.includes('work_order:approve'), 'T11 hq_commercial_director can approve WO');
  assert(!commDirPerms.includes('finance:manage'), 'T11 hq_commercial_director no finance:manage');

  const opsTrPerms = resolvePermissionsForRole(ROLE_SBU_OPS_TR);
  assert(opsTrPerms.includes('job_order:create'), 'T12 sbu_ops_tr has job_order:create');
  assert(!opsTrPerms.includes('finance:manage'), 'T12 sbu_ops_tr no finance:manage');
  assert(!opsTrPerms.includes('commercial:manage'), 'T12 sbu_ops_tr no commercial:manage');

  const driverPerms = resolvePermissionsForRole(ROLE_DRIVER);
  assert(driverPerms.includes('job_order:read'), 'T13 driver has job_order:read');
  assert(driverPerms.includes('job_order:complete'), 'T13 driver has job_order:complete');
  assert(driverPerms.length === 3, 'T13 driver has exactly 3 permissions');

  const unknownPerms = resolvePermissionsForRole('nonexistent_role_xyz');
  assert(unknownPerms.length === 0, 'T14 unknown role gets empty permissions');

  // -------------------------------------------------------------------
  // T15–T16: assertAnyPermission
  // -------------------------------------------------------------------
  const ctxOps = makeCtx(ROLE_SBU_OPS_TR);
  assertAnyPermission(ctxOps, 'job_order:read', 'fleet:read'); // either is fine
  assert(true, 'T15 assertAnyPermission matches one of many');
  assertThrows(
    () => assertAnyPermission(ctxOps, 'finance:manage', 'tenant:manage'),
    'FORBIDDEN_PERMISSION',
    'T16 assertAnyPermission denies when none match',
  );

  // -------------------------------------------------------------------
  // T17–T18: assertAllPermissions
  // -------------------------------------------------------------------
  assertAllPermissions(ctxOps, 'job_order:read', 'job_order:create');
  assert(true, 'T17 assertAllPermissions allows when all present');
  assertThrows(
    () => assertAllPermissions(ctxOps, 'job_order:read', 'finance:manage'),
    'FORBIDDEN_PERMISSION',
    'T18 assertAllPermissions denies when one missing',
  );

  // -------------------------------------------------------------------
  // T19–T20: assertRole
  // -------------------------------------------------------------------
  assertRole(ctxOps, ROLE_SBU_OPS_TR, 'sbu_manager_tr');
  assert(true, 'T19 assertRole allows matching role');
  assertThrows(
    () => assertRole(ctxOps, ROLE_HQ_COMMERCIAL_DIRECTOR, ROLE_OWNER),
    'FORBIDDEN_PERMISSION',
    'T20 assertRole denies non-matching role',
  );

  // -------------------------------------------------------------------
  // T21–T23: assertSbuAccess
  // -------------------------------------------------------------------
  const ctxGlobal = makeCtx(ROLE_HQ_COMMERCIAL_DIRECTOR);
  assertSbuAccess(ctxGlobal, 'trucking');
  assertSbuAccess(ctxGlobal, 'clearances');
  assert(true, 'T21 global role passes for any SBU');
  assertSbuAccess(ctxOps, 'trucking');
  assert(true, 'T22 SBU role passes for matching SBU');
  assertThrows(
    () => assertSbuAccess(ctxOps, 'clearances'),
    'FORBIDDEN_PERMISSION',
    'T23 SBU role denied for wrong SBU',
  );

  // -------------------------------------------------------------------
  // T24–T26: assertAuthorized (combined gate)
  // -------------------------------------------------------------------
  const TENANT_A = 'tenant-a-uuid';
  const TENANT_B = 'tenant-b-uuid';
  const ctxA = makeCtx(ROLE_SBU_OPS_TR, TENANT_A);
  assertAuthorized(ctxA, 'job_order:create', TENANT_A);
  assert(true, 'T24 assertAuthorized: permission + tenant match → allowed');
  assertThrows(
    () => assertAuthorized(ctxA, 'job_order:create', TENANT_B),
    'TENANT_MISMATCH',
    'T25 assertAuthorized: tenant mismatch → denied',
  );
  assertThrows(
    () => assertAuthorized(ctxA, 'finance:manage', TENANT_A),
    'FORBIDDEN_PERMISSION',
    'T26 assertAuthorized: missing permission → denied',
  );

  // -------------------------------------------------------------------
  // T27–T29: Resolver integration with U-02 normalization
  // -------------------------------------------------------------------
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

  // T27: Legacy admin role resolves to tenant_superadmin permissions
  const srcLegacy = new FakeSource();
  srcLegacy.addStaff('user-legacy', { membershipId: 'm-1', tenantId: 't-1', roleCode: ROLE_LEGACY_ADMIN });
  const ctxLegacy = resolveIdentityContext({ userId: 'user-legacy', source: srcLegacy });
  assert(ctxLegacy.role === ROLE_TENANT_SUPERADMIN, 'T27 legacy admin normalized to tenant_superadmin');
  assert(ctxLegacy.permissions.includes('staff:manage'), 'T27 tenant_superadmin has staff:manage');
  assert(ctxLegacy.permissions.includes('commercial:manage'), 'T27 tenant_superadmin has commercial:manage');

  // T28: SBU ops tr resolves with correct SBU scope
  const srcSbu = new FakeSource();
  srcSbu.addStaff('user-sbu', { membershipId: 'm-2', tenantId: 't-1', roleCode: ROLE_SBU_OPS_TR });
  const ctxSbu = resolveIdentityContext({ userId: 'user-sbu', source: srcSbu });
  assert(ctxSbu.sbuScope === 'trucking', 'T28 sbu_ops_tr → sbuScope = trucking');
  assert(ctxSbu.permissions.includes('job_order:create'), 'T28 sbu_ops_tr has job_order:create');
  assert(!ctxSbu.permissions.includes('finance:manage'), 'T28 sbu_ops_tr no finance:manage');

  // T29: Owner resolves with sbuScope=null
  const srcOwner = new FakeSource();
  srcOwner.addOwned('user-owner', { tenantId: 't-2', tenantCode: 'OWNER_TENANT' });
  const ctxOwner = resolveIdentityContext({ userId: 'user-owner', source: srcOwner });
  assert(ctxOwner.sbuScope === null, 'T29 owner sbuScope is null');
  assert(ctxOwner.permissions.includes('tenant:manage'), 'T29 owner has tenant:manage');

  // -------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------

  console.log('====================================================');
  console.log(`AUTHORIZATION GATE SUITE: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('====================================================');

  return { passed, failed, total: passed + failed };
}

/** Helper: build a minimal IdentityContext from a role code. */
function makeCtx(role: string, tenantId = 'tenant-test-001'): IdentityContext {
  return resolveIdentityContext({
    userId: 'user-test-001',
    source: {
      getStaffMemberships: () => [{ membershipId: 'm-test', tenantId, roleCode: role }],
      getOwnedTenants: () => [],
    },
  });
}
