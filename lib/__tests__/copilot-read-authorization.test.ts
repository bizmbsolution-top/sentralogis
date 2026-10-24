/**
 * Sentralogis — Copilot Read Authorization Architecture Tests
 * lib/__tests__/copilot-read-authorization.test.ts
 *
 * Verifies Human Architect Decision (Option 2):
 * - copilot:read is the entry permission for the Copilot interface (POST /api/copilot)
 * - copilot:read does NOT grant domain permissions (commercial, operational, financial, etc.)
 * - Operational roles (e.g. ROLE_SBU_OPS_TR) have copilot:read + job_order:read without commercial:read
 * - Downstream domain authorization remains independently authoritative
 */

import { describe, test, expect } from 'vitest';
import { assertPermission } from '../application/identity/resolver';
import { resolvePermissionsForRole } from '../application/identity/authorization';
import {
  ROLE_SBU_OPS_TR,
  ROLE_DRIVER,
  ROLE_GROUND_STAFF,
  ROLE_TENANT_ADMIN,
} from '../application/identity/roles';
import type { IdentityContext } from '../application/identity/types';

describe('Copilot Read Authorization Architecture (Option 2)', () => {
  const baseContext: Omit<IdentityContext, 'role' | 'permissions'> = {
    userId: 'usr-test-123',
    tenantId: 'tnt-test-123',
    isPlatformOwner: false,
    email: 'user@example.com',
    fullName: 'Test User',
    sbuScope: null,
  };

  test('1. copilot:read exists in role permissions for internal staff (e.g. ROLE_SBU_OPS_TR, ROLE_TENANT_ADMIN)', () => {
    const truckingOpsPerms = resolvePermissionsForRole(ROLE_SBU_OPS_TR);
    expect(truckingOpsPerms).toContain('copilot:read');
    expect(truckingOpsPerms).toContain('job_order:read');
    expect(truckingOpsPerms).not.toContain('commercial:read');

    const tenantAdminPerms = resolvePermissionsForRole(ROLE_TENANT_ADMIN);
    expect(tenantAdminPerms).toContain('copilot:read');
    expect(tenantAdminPerms).toContain('commercial:read');
  });

  test('2. External/Driver roles do NOT have copilot:read permission', () => {
    const driverPerms = resolvePermissionsForRole(ROLE_DRIVER);
    expect(driverPerms).not.toContain('copilot:read');

    const groundStaffPerms = resolvePermissionsForRole(ROLE_GROUND_STAFF);
    expect(groundStaffPerms).not.toContain('copilot:read');
  });

  test('3. User with copilot:read passes root copilot check but fails commercial:read check', () => {
    const opsUserContext: IdentityContext = {
      ...baseContext,
      role: ROLE_SBU_OPS_TR,
      permissions: ['copilot:read', 'job_order:read', 'work_order:read'],
    };

    // Passes copilot entry gate
    expect(() => assertPermission(opsUserContext, 'copilot:read')).not.toThrow();

    // Passes operational domain gate
    expect(() => assertPermission(opsUserContext, 'job_order:read')).not.toThrow();

    // Fails commercial domain gate downstream
    expect(() => assertPermission(opsUserContext, 'commercial:read')).toThrowError(/Missing required permission: commercial:read/);
  });

  test('4. User without copilot:read is rejected at Copilot route root', () => {
    const restrictedContext: IdentityContext = {
      ...baseContext,
      role: ROLE_DRIVER,
      permissions: ['fleet:read'],
    };

    expect(() => assertPermission(restrictedContext, 'copilot:read')).toThrowError(/Missing required permission: copilot:read/);
  });

  test('5. Static boundary: POST /api/copilot route enforces copilot:read at root, not commercial:read', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const routeContent = fs.readFileSync(path.resolve(process.cwd(), 'app/api/copilot/route.ts'), 'utf-8');

    expect(routeContent).toContain("assertPermission(ctx, 'copilot:read')");
    expect(routeContent).not.toContain("assertPermission(ctx, 'commercial:read')");
  });
});
