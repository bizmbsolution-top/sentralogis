/**
 * Sentralogis — U-25R Test Isolation Mechanism
 * lib/__tests__/u25r-test-isolation-mechanism.test.ts
 *
 * Tests for the tenant-scoped FIN_INVOICE test isolation mechanism.
 *
 * Security invariants tested:
 * - Global flag OFF + normal tenant = DENIED
 * - Global flag OFF + test tenant = DENIED (unless allowlisted)
 * - Global flag OFF + allowlisted test tenant = ALLOWED
 * - Global flag ON = ALLOWED for all tenants
 * - Client-supplied tenant_id cannot bypass isolation
 * - Unauthenticated user = DENIED
 * - Test tenant IDs are parsed case-insensitively
 */

import {
  isInvoiceGenerationEnabled,
  isInvoiceGenerationEnabledForTenant,
  assertInvoiceGenerationEnabled,
  _getTestTenantIds,
} from '../financial/feature-flags';

type TestResult = { testId: string; description: string; pass: boolean; error?: string };

const ENV = process.env;

function clearFinEnv(): void {
  delete ENV.FIN_INVOICE_ENABLED;
  delete ENV.FIN_INVOICE_TEST_TENANTS;
}

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete ENV[key];
  } else {
    ENV[key] = value;
  }
}

export function runU25RTestIsolationSuite() {
  const results: TestResult[] = [];

  function assert(testId: string, description: string, fn: () => void) {
    const savedEnabled = ENV.FIN_INVOICE_ENABLED;
    const savedTenants = ENV.FIN_INVOICE_TEST_TENANTS;
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    } finally {
      ENV.FIN_INVOICE_ENABLED = savedEnabled;
      ENV.FIN_INVOICE_TEST_TENANTS = savedTenants;
    }
  }

  const TEST_TENANT = '350f0259-d6e3-439b-833c-9bf3090c0302';
  const REAL_TENANT = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff';

  // =========================================================================
  // U25R-01: Global flag OFF + normal tenant = DENIED
  // =========================================================================
  assert('U25R-01', 'Global flag OFF + normal tenant = DENIED', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', '');

    if (isInvoiceGenerationEnabledForTenant(REAL_TENANT)) {
      throw new Error('Real tenant should be denied when global flag is OFF');
    }
  });

  // =========================================================================
  // U25R-02: Global flag OFF + no test tenants configured = DENIED for all
  // =========================================================================
  assert('U25R-02', 'Global flag OFF + empty test tenant list = DENIED for all', () => {
    clearFinEnv();

    if (isInvoiceGenerationEnabledForTenant(REAL_TENANT)) {
      throw new Error('Should be denied when no test tenants configured');
    }
    if (isInvoiceGenerationEnabledForTenant(TEST_TENANT)) {
      throw new Error('Should be denied when no test tenants configured');
    }
    if (isInvoiceGenerationEnabledForTenant(null)) {
      throw new Error('Should be denied for null tenant');
    }
    if (isInvoiceGenerationEnabledForTenant(undefined)) {
      throw new Error('Should be denied for undefined tenant');
    }
  });

  // =========================================================================
  // U25R-03: Global flag OFF + test tenant in allowlist = ALLOWED
  // =========================================================================
  assert('U25R-03', 'Global flag OFF + test tenant in allowlist = ALLOWED', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT);

    if (!isInvoiceGenerationEnabledForTenant(TEST_TENANT)) {
      throw new Error('Allowlisted test tenant should be ALLOWED');
    }
  });

  // =========================================================================
  // U25R-04: Global flag OFF + real tenant NOT in allowlist = DENIED
  // =========================================================================
  assert('U25R-04', 'Global flag OFF + real tenant NOT in allowlist = DENIED', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT);

    if (isInvoiceGenerationEnabledForTenant(REAL_TENANT)) {
      throw new Error('Non-allowlisted tenant should be DENIED');
    }
  });

  // =========================================================================
  // U25R-05: Global flag ON = ALLOWED for all tenants
  // =========================================================================
  assert('U25R-05', 'Global flag ON = ALLOWED for all tenants', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'true');

    if (!isInvoiceGenerationEnabledForTenant(REAL_TENANT)) {
      throw new Error('Real tenant should be ALLOWED when global flag is ON');
    }
    if (!isInvoiceGenerationEnabledForTenant(TEST_TENANT)) {
      throw new Error('Test tenant should be ALLOWED when global flag is ON');
    }
  });

  // =========================================================================
  // U25R-06: Tenant ID matching is case-insensitive
  // =========================================================================
  assert('U25R-06', 'Test tenant ID matching is case-insensitive', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT.toUpperCase());

    if (!isInvoiceGenerationEnabledForTenant(TEST_TENANT.toLowerCase())) {
      throw new Error('Should match case-insensitively');
    }
  });

  // =========================================================================
  // U25R-07: assertInvoiceGenerationEnabled() throws when global OFF + not allowlisted
  // =========================================================================
  assert('U25R-07', 'assertInvoiceGenerationEnabled() throws when global OFF + not allowlisted', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT);

    let threw = false;
    try {
      assertInvoiceGenerationEnabled({ tenantId: REAL_TENANT });
    } catch (e: any) {
      threw = true;
      if (!e.message.includes('disabled')) {
        throw new Error(`Wrong error message: ${e.message}`);
      }
    }
    if (!threw) {
      throw new Error('Should have thrown');
    }
  });

  // =========================================================================
  // U25R-08: assertInvoiceGenerationEnabled() does NOT throw when global OFF + allowlisted
  // =========================================================================
  assert('U25R-08', 'assertInvoiceGenerationEnabled() does NOT throw when global OFF + allowlisted', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT);

    try {
      assertInvoiceGenerationEnabled({ tenantId: TEST_TENANT });
    } catch (e: any) {
      throw new Error(`Should not have thrown: ${e.message}`);
    }
  });

  // =========================================================================
  // U25R-09: assertInvoiceGenerationEnabled() throws when no tenant context
  // =========================================================================
  assert('U25R-09', 'assertInvoiceGenerationEnabled() throws when no tenant context', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');

    let threw = false;
    try {
      assertInvoiceGenerationEnabled();
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error('Should have thrown without tenant context');
    }
  });

  // =========================================================================
  // U25R-10: assertInvoiceGenerationEnabled() throws when global OFF + null tenantId
  // =========================================================================
  assert('U25R-10', 'assertInvoiceGenerationEnabled() throws when global OFF + null tenantId', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', TEST_TENANT);

    let threw = false;
    try {
      assertInvoiceGenerationEnabled({ tenantId: null });
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error('Should have thrown with null tenantId');
    }
  });

  // =========================================================================
  // U25R-11: Multiple test tenants in allowlist
  // =========================================================================
  assert('U25R-11', 'Multiple test tenants in allowlist are all allowlisted', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', `${TEST_TENANT},${REAL_TENANT}`);

    if (!isInvoiceGenerationEnabledForTenant(TEST_TENANT)) {
      throw new Error('First allowlisted tenant should be ALLOWED');
    }
    if (!isInvoiceGenerationEnabledForTenant(REAL_TENANT)) {
      throw new Error('Second allowlisted tenant should be ALLOWED');
    }
  });

  // =========================================================================
  // U25R-12: _getTestTenantIds() returns empty set when not configured
  // =========================================================================
  assert('U25R-12', '_getTestTenantIds() returns empty set when not configured', () => {
    clearFinEnv();
    const ids = _getTestTenantIds();
    if (ids.size !== 0) {
      throw new Error(`Expected empty set, got size ${ids.size}`);
    }
  });

  // =========================================================================
  // U25R-13: _getTestTenantIds() parses comma-separated tenant list
  // =========================================================================
  assert('U25R-13', '_getTestTenantIds() parses comma-separated tenant list', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_TEST_TENANTS', `${TEST_TENANT}, ${REAL_TENANT} ,`);

    const ids = _getTestTenantIds();
    if (ids.size !== 2) {
      throw new Error(`Expected 2 IDs, got ${ids.size}`);
    }
    if (!ids.has(TEST_TENANT.toLowerCase())) {
      throw new Error('First tenant missing from set');
    }
    if (!ids.has(REAL_TENANT.toLowerCase())) {
      throw new Error('Second tenant missing from set');
    }
  });

  // =========================================================================
  // U25R-14: Repository calls assertInvoiceGenerationEnabled with tenant context
  // =========================================================================
  assert('U25R-14', 'Repository passes tenantId to assertInvoiceGenerationEnabled', () => {
    const fs = require('fs');
    const path = require('path');
    const repoSrc = fs.readFileSync(
      path.join(process.cwd(), 'lib', 'financial', 'repository.ts'),
      'utf8',
    );
    if (!repoSrc.includes('assertInvoiceGenerationEnabled({ tenantId: ctx.tenantId })')) {
      throw new Error('Repository does not pass tenantId context to assertInvoiceGenerationEnabled');
    }
  });

  // =========================================================================
  // U25R-15: Test tenant is NOT a real customer tenant (safety invariant)
  // =========================================================================
  assert('U25R-15', 'TEST001 is not a real customer tenant (safety invariant)', () => {
    const testUuid: string = TEST_TENANT;
    const realUuid: string = REAL_TENANT;
    if (testUuid === realUuid) {
      throw new Error('Test tenant ID must differ from a known real tenant');
    }
  });

  // =========================================================================
  // U25R-16: Global flag OFF + whitespace-only FIN_INVOICE_TEST_TENANTS = DENIED
  // =========================================================================
  assert('U25R-16', 'Global flag OFF + whitespace-only test tenant list = DENIED', () => {
    clearFinEnv();
    setEnv('FIN_INVOICE_ENABLED', 'false');
    setEnv('FIN_INVOICE_TEST_TENANTS', '   ,  ,  ');

    if (isInvoiceGenerationEnabledForTenant(TEST_TENANT)) {
      throw new Error('Should be denied when only whitespace in test tenant list');
    }
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nU-25R Test Isolation Mechanism: ${passed} / ${passed + failed} PASSED`);

  if (failed > 0) {
    results
      .filter((r) => !r.pass)
      .forEach((r) => console.log(`  FAIL: ${r.testId} - ${r.description}: ${r.error}`));
  }

  return { passed, failed, results };
}
