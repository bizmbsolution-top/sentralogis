/**
 * Sentralogis — D-COPILOT-TENANT-REMEDIATION-01
 * lib/__tests__/active-membership-remediation.test.ts
 *
 * Targeted verification for Active Tenant Membership Remediation.
 * Proves:
 *   TEST A — ACTIVE MEMBERSHIP: is_active = true resolves tenant context.
 *   TEST B — INACTIVE MEMBERSHIP: is_active = false rejects membership (NO_TENANT_MEMBERSHIP).
 *   TEST C — NO MEMBERSHIP: no membership rejects (NO_TENANT_MEMBERSHIP).
 *   TEST D — ROLE DERIVATION: role is derived from active membership only.
 *   TEST E — MULTI-TENANT SWITCH: active target allowed; inactive target rejected.
 *   TEST F — CROSS-TENANT: forged requestedTenantId rejected (TENANT_MISMATCH).
 *   TEST G — RLS SOURCE: SQL migration file requires is_active = true on tenant_users.
 *   TEST H — SESSION SOURCE: session-source.ts contains .eq('is_active', true).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveIdentityContext } from '../application/identity/resolver';
import { resolveFromArrays } from '../application/identity/membership-source';
import { IdentityResolutionError } from '../application/identity/errors';

describe('D-COPILOT-TENANT-REMEDIATION-01: Active Tenant Membership Remediation', () => {
  const USER_ACTIVE = 'user-active-001';
  const USER_INACTIVE = 'user-inactive-002';
  const USER_NONE = 'user-none-003';
  const USER_MULTI = 'user-multi-004';

  const TENANT_A = 'tenant-aaaa-1111';
  const TENANT_B = 'tenant-bbbb-2222';
  const TENANT_FORGED = 'tenant-forged-9999';

  // Simulates rows filtered by `tenant_users.is_active = true` (as executed by session-source.ts)
  function simulateSessionMembershipLookup(dbRows: Array<{ id: string; user_id: string; tenant_id: string; role_code: string | null; is_active: boolean }>, userId: string) {
    // The remediation: query has `.eq('user_id', userId).eq('is_active', true)`
    return dbRows.filter(r => r.user_id === userId && r.is_active === true);
  }

  const sampleDb = [
    { id: 'm-1', user_id: USER_ACTIVE, tenant_id: TENANT_A, role_code: 'tenant_admin', is_active: true },
    { id: 'm-2', user_id: USER_INACTIVE, tenant_id: TENANT_A, role_code: 'sbu_ops_tr', is_active: false },
    { id: 'm-3', user_id: USER_MULTI, tenant_id: TENANT_A, role_code: 'sbu_ops_tr', is_active: true },
    { id: 'm-4', user_id: USER_MULTI, tenant_id: TENANT_B, role_code: 'sbu_manager_wh', is_active: false },
  ];

  it('TEST A — ACTIVE MEMBERSHIP: is_active = true resolves valid identity context', () => {
    const activeRows = simulateSessionMembershipLookup(sampleDb, USER_ACTIVE);
    const source = resolveFromArrays(activeRows, []);
    const ctx = resolveIdentityContext({ userId: USER_ACTIVE, source });

    expect(ctx.userId).toBe(USER_ACTIVE);
    expect(ctx.tenantId).toBe(TENANT_A);
    expect(ctx.membershipId).toBe('m-1');
    expect(ctx.role).toBe('tenant_admin');
    expect(ctx.permissions).toContain('copilot:read');
  });

  it('TEST B — INACTIVE MEMBERSHIP: is_active = false results in NO_TENANT_MEMBERSHIP rejection', () => {
    const activeRows = simulateSessionMembershipLookup(sampleDb, USER_INACTIVE);
    const source = resolveFromArrays(activeRows, []);

    expect(() => {
      resolveIdentityContext({ userId: USER_INACTIVE, source });
    }).toThrowError(IdentityResolutionError);

    try {
      resolveIdentityContext({ userId: USER_INACTIVE, source });
    } catch (err: any) {
      expect(err.code).toBe('NO_TENANT_MEMBERSHIP');
      expect(err.statusCode).toBe(403);
    }
  });

  it('TEST C — NO MEMBERSHIP: unlinked user rejected with NO_TENANT_MEMBERSHIP', () => {
    const activeRows = simulateSessionMembershipLookup(sampleDb, USER_NONE);
    const source = resolveFromArrays(activeRows, []);

    expect(() => {
      resolveIdentityContext({ userId: USER_NONE, source });
    }).toThrowError(IdentityResolutionError);

    try {
      resolveIdentityContext({ userId: USER_NONE, source });
    } catch (err: any) {
      expect(err.code).toBe('NO_TENANT_MEMBERSHIP');
    }
  });

  it('TEST D — ROLE DERIVATION: role is derived from active membership only', () => {
    const activeRows = simulateSessionMembershipLookup(sampleDb, USER_ACTIVE);
    const source = resolveFromArrays(activeRows, []);
    const ctx = resolveIdentityContext({ userId: USER_ACTIVE, source });

    expect(ctx.role).toBe('tenant_admin');
    expect(ctx.permissions).toContain('commercial:manage');

    // Inactive user cannot derive role because resolution fails before role assignment
    const inactiveRows = simulateSessionMembershipLookup(sampleDb, USER_INACTIVE);
    const inactiveSource = resolveFromArrays(inactiveRows, []);
    expect(() => resolveIdentityContext({ userId: USER_INACTIVE, source: inactiveSource })).toThrow();
  });

  it('TEST E — MULTI-TENANT SWITCH: active target allowed; inactive target rejected', () => {
    // User has active membership in Tenant A, inactive in Tenant B
    const userRows = simulateSessionMembershipLookup(sampleDb, USER_MULTI);
    const source = resolveFromArrays(userRows, []);

    // Default resolution picks active Tenant A
    const ctxA = resolveIdentityContext({ userId: USER_MULTI, source });
    expect(ctxA.tenantId).toBe(TENANT_A);
    expect(ctxA.role).toBe('sbu_ops_tr');

    // Requesting inactive Tenant B must throw TENANT_MISMATCH (403)
    expect(() => {
      resolveIdentityContext({ userId: USER_MULTI, requestedTenantId: TENANT_B, source });
    }).toThrowError(IdentityResolutionError);

    try {
      resolveIdentityContext({ userId: USER_MULTI, requestedTenantId: TENANT_B, source });
    } catch (err: any) {
      expect(err.code).toBe('TENANT_MISMATCH');
      expect(err.statusCode).toBe(403);
    }
  });

  it('TEST F — CROSS-TENANT: forged requestedTenantId rejected with TENANT_MISMATCH', () => {
    const activeRows = simulateSessionMembershipLookup(sampleDb, USER_ACTIVE);
    const source = resolveFromArrays(activeRows, []);

    expect(() => {
      resolveIdentityContext({ userId: USER_ACTIVE, requestedTenantId: TENANT_FORGED, source });
    }).toThrowError(IdentityResolutionError);

    try {
      resolveIdentityContext({ userId: USER_ACTIVE, requestedTenantId: TENANT_FORGED, source });
    } catch (err: any) {
      expect(err.code).toBe('TENANT_MISMATCH');
      expect(err.statusCode).toBe(403);
    }
  });

  it('TEST G — RLS SOURCE: migration 20261006_001 enforces is_active = true in get_my_tenant_id()', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../supabase/migrations/20261006_001_get_my_tenant_id_active_membership.sql',
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.get_my_tenant_id()');
    expect(sqlContent).toMatch(/FROM public\.tenant_users WHERE user_id = auth\.uid\(\) AND is_active = true/);
    expect(sqlContent).toContain('SELECT id FROM public.tenants WHERE user_id = auth.uid()');
  });

  it('TEST H — SESSION SOURCE: session-source.ts contains .eq(\'is_active\', true)', () => {
    const sessionSourcePath = path.resolve(__dirname, '../application/identity/session-source.ts');
    const content = fs.readFileSync(sessionSourcePath, 'utf8');
    expect(content).toContain('.from(\'tenant_users\')');
    expect(content).toContain('.eq(\'is_active\', true)');
  });
});
