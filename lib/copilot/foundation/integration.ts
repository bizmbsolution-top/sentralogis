/**
 * Sentralogis — AI Copilot Foundation
 * lib/copilot/foundation/integration.ts
 *
 * Foundation integration with canonical identity/authentication.
 *
 * This module provides the authorized bridge from platform IdentityContext
 * into the Copilot Foundation layer. It does NOT implement READ/PROPOSE/EXECUTE
 * behavior — it only establishes the integration boundary.
 *
 * Canonical flow:
 *   Authenticated Session
 *   → resolveApiAuthContext / resolveSessionIdentity
 *   → server-derived tenantId
 *   → canonical service/query boundary
 *   → tenant-scoped operation
 *   → RLS as defense-in-depth where applicable
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import type { FoundationContext, FoundationCapability } from './types';

/**
 * Current Foundation contract version.
 * Incremented when contract shapes change incompatibly.
 */
export const FOUNDATION_VERSION = '1.0.0';

/**
 * All capabilities provided by the Foundation stage.
 * These represent the query contracts that future READ implementation
 * will consume. Foundation does NOT implement the contracts;
 * it defines them and establishes the integration boundary.
 */
export const FOUNDATION_CAPABILITIES: readonly FoundationCapability[] = [
  'timeline',
  'operational-summary',
  'entity-search',
  'notification-inbox',
] as const;

/**
 * Create a FoundationContext from a canonical IdentityContext.
 *
 * This is the ONLY authorized entry point from platform identity
 * into the Copilot Foundation layer.
 *
 * @param identity - Canonical IdentityContext from resolveSessionIdentity
 * @returns FoundationContext with declared capabilities
 */
export function createFoundationContext(
  identity: IdentityContext,
): FoundationContext {
  return {
    identity,
    version: FOUNDATION_VERSION,
    capabilities: [...FOUNDATION_CAPABILITIES],
  };
}

/**
 * Validate that a FoundationContext is well-formed and not expired.
 * Currently a structural check; future versions may add token/lease semantics.
 */
export function validateFoundationContext(
  context: FoundationContext,
): boolean {
  if (!context.identity?.tenantId) {
    return false;
  }
  if (!context.identity?.userId) {
    return false;
  }
  if (context.version !== FOUNDATION_VERSION) {
    return false;
  }
  return true;
}

/**
 * Extract server-derived tenantId from FoundationContext.
 * This is the single source of truth for tenant scoping.
 * Copilot code MUST NOT use client-supplied tenant identifiers.
 */
export function getFoundationTenantId(context: FoundationContext): string {
  return context.identity.tenantId;
}

/**
 * Extract server-derived userId from FoundationContext.
 */
export function getFoundationUserId(context: FoundationContext): string {
  return context.identity.userId;
}

/**
 * Check whether a specific capability is declared in the Foundation context.
 */
export function hasCapability(
  context: FoundationContext,
  capability: FoundationCapability,
): boolean {
  return context.capabilities.includes(capability);
}
