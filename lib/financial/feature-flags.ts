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
 * Environment variable:
 * - FIN_INVOICE_ENABLED=true/false
 */

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
};

function isFeatureEnabled(envVar: string): boolean {
  const value = process.env[envVar];
  // Fail closed: only explicit 'true' enables the capability.
  // Absent, null, undefined, 'false', '0', 'no', empty string all disable.
  return value === 'true' || value === '1' || value === 'yes';
}

export function isInvoiceGenerationEnabled(): boolean {
  const flag = FINANCIAL_FEATURE_FLAGS.INVOICE_GENERATION;
  if (!flag) return false;
  return isFeatureEnabled(flag.envVar);
}

/**
 * Assert that invoice generation is enabled.
 * Throws if the capability is disabled or misconfigured.
 */
export function assertInvoiceGenerationEnabled(): void {
  if (!isInvoiceGenerationEnabled()) {
    throw new Error('FIN_INVOICE capability is disabled. Invoice generation is not authorized.');
  }
}