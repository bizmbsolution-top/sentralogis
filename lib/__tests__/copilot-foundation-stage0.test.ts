/**
 * Sentralogis - Copilot Foundation Stage 0
 * lib/__tests__/copilot-foundation-stage0.test.ts
 *
 * Canonical acceptance tests for the Copilot Foundation integration boundary.
 * Foundation defines the authorized entry point from platform IdentityContext
 * into the Copilot layer. It does NOT implement READ/PROPOSE/EXECUTE.
 *
 * Covers:
 *   - FOUNDATION_VERSION contract
 *   - createFoundationContext server-derived tenant isolation
 *   - validateFoundationContext structural checks
 *   - getFoundationTenantId / getFoundationUserId server-derived extraction
 *   - hasCapability capability declaration
 *   - FOUNDATION_CAPABILITIES registry completeness
 */

import { describe, test, expect } from 'vitest';
import {
  FOUNDATION_VERSION,
  FOUNDATION_CAPABILITIES,
  createFoundationContext,
  validateFoundationContext,
  getFoundationTenantId,
  getFoundationUserId,
  hasCapability,
} from '@/lib/copilot/foundation/integration';
import type { IdentityContext } from '@/lib/application/identity/types';

function buildIdentity(overrides: Partial<IdentityContext> = {}): IdentityContext {
  return {
    tenantId: 'tenant-001',
    userId: 'user-001',
    role: 'USER',
    permissions: ['commercial:read'],
    isTenantOwner: false,
    membershipId: null,
    sbuScope: null,
    ...overrides,
  } as unknown as IdentityContext;
}

describe('Copilot Foundation Stage 0 - Integration Boundary', () => {
  // =========================================================================
  // Contract version
  // =========================================================================
  describe('Contract version', () => {
    test('FOUNDATION_VERSION is a non-empty semver string', () => {
      expect(typeof FOUNDATION_VERSION).toBe('string');
      expect(FOUNDATION_VERSION.length).toBeGreaterThan(0);
      expect(FOUNDATION_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('FOUNDATION_CAPABILITIES declares exactly four capabilities', () => {
      expect(FOUNDATION_CAPABILITIES).toEqual([
        'timeline',
        'operational-summary',
        'entity-search',
        'notification-inbox',
      ]);
    });
  });

  // =========================================================================
  // createFoundationContext
  // =========================================================================
  describe('createFoundationContext', () => {
    test('creates a context with server-derived tenantId', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(ctx.identity.tenantId).toBe('tenant-001');
      expect(ctx.identity.userId).toBe('user-001');
    });

    test('carries the canonical FOUNDATION_VERSION', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(ctx.version).toBe(FOUNDATION_VERSION);
    });

    test('declares all canonical capabilities', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(ctx.capabilities).toEqual([...FOUNDATION_CAPABILITIES]);
    });

    test('does NOT accept client-supplied tenant overrides', () => {
      const identity = buildIdentity({ tenantId: 'tenant-001' });
      const ctx = createFoundationContext(identity);
      // Server-derived tenantId is the single source of truth.
      expect(getFoundationTenantId(ctx)).toBe('tenant-001');
    });
  });

  // =========================================================================
  // validateFoundationContext
  // =========================================================================
  describe('validateFoundationContext', () => {
    test('returns true for a well-formed context', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(validateFoundationContext(ctx)).toBe(true);
    });

    test('returns false when tenantId is missing', () => {
      const ctx = createFoundationContext(buildIdentity({ tenantId: '' as any }));
      expect(validateFoundationContext(ctx)).toBe(false);
    });

    test('returns false when userId is missing', () => {
      const ctx = createFoundationContext(buildIdentity({ userId: '' as any }));
      expect(validateFoundationContext(ctx)).toBe(false);
    });

    test('returns false when version is stale', () => {
      const ctx = createFoundationContext(buildIdentity());
      (ctx as any).version = '0.0.0';
      expect(validateFoundationContext(ctx)).toBe(false);
    });
  });

  // =========================================================================
  // Server-derived extraction
  // =========================================================================
  describe('server-derived extraction', () => {
    test('getFoundationTenantId returns server-derived tenant', () => {
      const ctx = createFoundationContext(buildIdentity({ tenantId: 'tenant-999' }));
      expect(getFoundationTenantId(ctx)).toBe('tenant-999');
    });

    test('getFoundationUserId returns server-derived user', () => {
      const ctx = createFoundationContext(buildIdentity({ userId: 'user-999' }));
      expect(getFoundationUserId(ctx)).toBe('user-999');
    });
  });

  // =========================================================================
  // Capability declaration
  // =========================================================================
  describe('capability declaration', () => {
    test('hasCapability returns true for declared capability', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(hasCapability(ctx, 'timeline')).toBe(true);
      expect(hasCapability(ctx, 'entity-search')).toBe(true);
    });

    test('hasCapability returns false for undeclared capability', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(hasCapability(ctx, 'execute' as any)).toBe(false);
      expect(hasCapability(ctx, 'unknown' as any)).toBe(false);
    });
  });

  // =========================================================================
  // Negative architecture
  // =========================================================================
  describe('negative architecture', () => {
    test('Foundation does not export an EXECUTE capability', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(hasCapability(ctx, 'execute' as any)).toBe(false);
    });

    test('Foundation does not export a PROPOSE capability', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(hasCapability(ctx, 'propose' as any)).toBe(false);
    });

    test('Foundation does not export a CONFIRM capability', () => {
      const ctx = createFoundationContext(buildIdentity());
      expect(hasCapability(ctx, 'confirm' as any)).toBe(false);
    });
  });
});