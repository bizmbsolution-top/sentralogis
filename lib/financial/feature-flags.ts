/**
 * Sentralogis — Phase 5D-2 / U-25
 * lib/financial/feature-flags.ts
 *
 * FIN_INVOICE capability rollout gate.
 *
 * Controls whether the canonical invoice-generation mutation path is enabled.
 * Defaults to OFF. Fails closed when configuration is absent or invalid.
 *
 * This flag controls the financial mutation capability, not merely UI visibility.
 * It is evaluated server-side before any invoice mutation.
 *
 * Environment variables:
 * - FIN_INVOICE_ENABLED=true/false (global enable — fails closed when absent/invalid)
 * - FIN_INVOICE_TEST_TENANTS=<comma-separated tenant UUIDs> (optional test-only allowlist)
 *
 * Security model:
 * - Global flag OFF is the safe default — all production tenants are denied.
 * - Test tenants can be allowlisted via FIN_INVOICE_TEST_TENANTS for controlled
 *   runtime testing WITHOUT enabling the capability for all production tenants.
 * - Tenant identity is ALWAYS server-derived from IdentityContext (never client-supplied).
 * - The test allowlist is a Vercel env var — auditable and reversible.
 *
 * U-25/U-25R: Invoice numbers MUST be allocated by next_invoice_number() server function.
 * Client-side generation remains outlawed.
 */

import { FinancialError } from './types';

type FinancialFeatureFlag = {
  key: string;
  envVar: string;
  description: string;
};

export const FINANCIAL_FEATURE_FLAGS: Record<string, FinancialFeatureFlag> = {
  INVOICE_GENERATION: {
    key: 'INVOICE_GENERATION',
    envVar: 'FIN_INVOICE_ENABLED',
    description: 'Enable canonical invoice generation via createInvoice() → generate_invoice()',
  },
  PAYMENT_MUTATION: {
    key: 'PAYMENT_MUTATION',
    envVar: 'FIN_PAYMENT_ENABLED',
    description: 'Enable canonical payment, allocation, and settlement mutations',
  },
};

function isFeatureEnabled(envVar: string): boolean {
  const value = process.env[envVar];
  return value === 'true' || value === '1' || value === 'yes';
}

function getTestTenantIds(): Set<string> {
  const raw = process.env.FIN_INVOICE_TEST_TENANTS;
  if (!raw || raw.trim() === '') return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.toLowerCase()),
  );
}

export function isInvoiceGenerationEnabled(): boolean {
  const flag = FINANCIAL_FEATURE_FLAGS.INVOICE_GENERATION;
  if (!flag) return false;
  return isFeatureEnabled(flag.envVar);
}

export function isInvoiceGenerationEnabledForTenant(tenantId?: string | null): boolean {
  if (isInvoiceGenerationEnabled()) return true;
  if (!tenantId) return false;
  return getTestTenantIds().has(tenantId.toLowerCase());
}

export function assertInvoiceGenerationEnabled(ctx?: { tenantId?: string | null }): void {
  if (!isInvoiceGenerationEnabledForTenant(ctx?.tenantId)) {
    throw new FinancialError(
      'CAPABILITY_DISABLED',
      403,
      'FIN_INVOICE capability is disabled. Invoice generation is not authorized.',
    );
  }
}

export function _getTestTenantIds(): Set<string> {
  return getTestTenantIds();
}

function getPaymentTestTenantIds(): Set<string> {
  const raw = process.env.FIN_PAYMENT_TEST_TENANTS;
  if (!raw || raw.trim() === '') return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.toLowerCase()),
  );
}

export function isPaymentMutationEnabled(): boolean {
  const flag = FINANCIAL_FEATURE_FLAGS.PAYMENT_MUTATION;
  if (!flag) return false;
  return isFeatureEnabled(flag.envVar);
}

export function isPaymentMutationEnabledForTenant(tenantId?: string | null): boolean {
  if (isPaymentMutationEnabled()) return true;
  if (!tenantId) return false;
  return getPaymentTestTenantIds().has(tenantId.toLowerCase());
}

export function assertPaymentMutationEnabled(ctx?: { tenantId?: string | null }): void {
  if (!isPaymentMutationEnabledForTenant(ctx?.tenantId)) {
    throw new FinancialError(
      'CAPABILITY_DISABLED',
      403,
      '[CAPABILITY_DISABLED] FIN_PAYMENT capability is disabled. Payment mutation is not authorized.',
    );
  }
}

export function _getPaymentTestTenantIds(): Set<string> {
  return getPaymentTestTenantIds();
}