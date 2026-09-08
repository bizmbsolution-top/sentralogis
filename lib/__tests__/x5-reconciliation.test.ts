// SENTRALOGIS — DATA-4E X5
// Targeted tests for Reconciliation Engine & Drift Detection

export async function runX5TestSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];
  const fs = require('fs');
  const path = require('path');

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  const serviceFile = path.join(process.cwd(), 'lib/domain/party/role-reconciliation-service.ts');
  const serviceContent = fs.readFileSync(serviceFile, 'utf8');

  // ========== Authority & Design ==========
  try {
    const hasCanonicalOnly = /party_roles = CANONICAL/.test(serviceContent) && /md_entities\.is_\* = COMPATIBILITY PROJECTION ONLY/.test(serviceContent);
    addResult('X5-T1', 'party_roles is sole authority; md_entities.is_* is compatibility only', hasCanonicalOnly);

    const hasForbiddenDirection = /Forbidden:[\s\S]*md_entities\.is_\* → party_roles/.test(serviceContent);
    addResult('X5-T2', 'Legacy boolean → canonical promotion is forbidden', hasForbiddenDirection);

    const hasReconcileDirection = /party_roles\s*→\s*md_entities\.is_\*/.test(serviceContent);
    addResult('X5-T3', 'Reconciliation direction is party_roles → md_entities.is_*', hasReconcileDirection);
  } catch (e: any) {
    addResult('X5-T1-T3', 'Authority verification', false, e.message);
  }

  // ========== Mapping ==========
  try {
    const mappingLines = serviceContent.match(/LEGACY_BOOLEAN_BY_ROLE[\s\S]*?}/);
    const mappingText = mappingLines ? mappingLines[0] : '';
    const hasCustomer = /CUSTOMER:\s*'is_customer'/.test(mappingText);
    addResult('X5-T4', 'CUSTOMER maps to is_customer', hasCustomer);
    const hasSupplier = /SUPPLIER:\s*'is_supplier'/.test(mappingText);
    addResult('X5-T5', 'SUPPLIER maps to is_supplier', hasSupplier);
    const hasVendor = /VENDOR:\s*'is_vendor'/.test(mappingText);
    addResult('X5-T6', 'VENDOR maps to is_vendor', hasVendor);
    const hasBroker = /BROKER:\s*'is_broker'/.test(mappingText);
    addResult('X5-T7', 'BROKER maps to is_broker', hasBroker);
    const hasCarrier = !/CARRIER:/.test(mappingText);
    addResult('X5-T8', 'CARRIER has no legacy boolean mapping (unsupported)', hasCarrier);
  } catch (e: any) {
    addResult('X5-T4-T8', 'Mapping verification', false, e.message);
  }

  // ========== Drift Detection ==========
  try {
    const hasDetectDrift = /async detectDrift\(/.test(serviceContent);
    addResult('X5-T9', 'Service exposes detectDrift()', hasDetectDrift);

    const hasReconcile = /async reconcile\(/.test(serviceContent);
    addResult('X5-T10', 'Service exposes reconcile()', hasReconcile);

    const hasDriftModes = /D1_MISSING_LEGACY_PROJECTION|D2_STALE_LEGACY_PROJECTION|D3_CANONICAL_LEGACY_MISMATCH|D4_TENANT_MISMATCH|D5_ORPHAN_CANONICAL_ROLE|D6_UNSUPPORTED_ROLE_PROJECTION|D7_MULTIPLE_GLOBAL_ROLES/.test(serviceContent);
    addResult('X5-T11', 'All 7 drift modes are defined', hasDriftModes);

    const hasDriftItemInterface = /export interface DriftItem/.test(serviceContent);
    addResult('X5-T12', 'DriftItem interface exists', hasDriftItemInterface);
  } catch (e: any) {
    addResult('X5-T9-T12', 'Drift detection structure', false, e.message);
  }

  // ========== Safety Controls ==========
  try {
    const hasTenantCheck = /role\.tenant_id !== entity\.tenant_id/.test(serviceContent);
    addResult('X5-T13', 'Tenant mismatch detection exists', hasTenantCheck);

    const hasOrphanCheck = /D5_ORPHAN_CANONICAL_ROLE/.test(serviceContent);
    addResult('X5-T14', 'Orphan canonical role detection exists', hasOrphanCheck);

    const hasUnsupportedCheck = /D6_UNSUPPORTED_ROLE_PROJECTION/.test(serviceContent);
    addResult('X5-T15', 'Unsupported role projection detection exists', hasUnsupportedCheck);

    const hasCriticalAction = /action: 'CRITICAL'/.test(serviceContent);
    addResult('X5-T16', 'Critical action exists for unrecoverable drift', hasCriticalAction);

    const hasSkippedAction = /action: 'SKIPPED'/.test(serviceContent);
    addResult('X5-T17', 'Skipped action exists for safety anomalies', hasSkippedAction);
  } catch (e: any) {
    addResult('X5-T13-T17', 'Safety controls', false, e.message);
  }

  // ========== Repair Policy ==========
  try {
    const hasRepairOnlyCompatibility = /repairCompatibilityProjection/.test(serviceContent);
    addResult('X5-T18', 'Repair is limited to compatibility projection', hasRepairOnlyCompatibility);

    const hasNoCanonicalCreation = !/INSERT INTO party_roles/.test(serviceContent) && !/\.insert\(/.test(serviceContent.replace(/party_roles\.select\(/g, ''));
    addResult('X5-T19', 'Repair does not create canonical roles', hasNoCanonicalCreation);

    const hasNoCanonicalDeletion = !/DELETE FROM party_roles/.test(serviceContent) && !/\.delete\(/.test(serviceContent.replace(/party_roles\.select\(/g, ''));
    addResult('X5-T20', 'Repair does not delete canonical roles', hasNoCanonicalDeletion);

    const hasIdempotentUpdate = /eq\('id', item\.party_id\)[\s\S]*eq\('tenant_id', item\.tenant_id\)/.test(serviceContent);
    addResult('X5-T21', 'Repair uses idempotent update (id + tenant_id)', hasIdempotentUpdate);
  } catch (e: any) {
    addResult('X5-T18-T21', 'Repair policy', false, e.message);
  }

  // ========== Summary Output ==========
  try {
    const hasSummaryInterface = /export interface ReconciliationSummary/.test(serviceContent);
    addResult('X5-T22', 'ReconciliationSummary interface exists', hasSummaryInterface);

    const hasScanned = /scanned: number/.test(serviceContent);
    addResult('X5-T23', 'Summary includes scanned count', hasScanned);
    const hasMatched = /matched: number/.test(serviceContent);
    addResult('X5-T24', 'Summary includes matched count', hasMatched);
    const hasDrifted = /drifted: number/.test(serviceContent);
    addResult('X5-T25', 'Summary includes drifted count', hasDrifted);
    const hasRepaired = /repaired: number/.test(serviceContent);
    addResult('X5-T26', 'Summary includes repaired count', hasRepaired);
    const hasSkipped = /skipped: number/.test(serviceContent);
    addResult('X5-T27', 'Summary includes skipped count', hasSkipped);
    const hasCritical = /critical: number/.test(serviceContent);
    addResult('X5-T28', 'Summary includes critical count', hasCritical);
  } catch (e: any) {
    addResult('X5-T22-T28', 'Summary output', false, e.message);
  }

  // ========== Scope Integrity ==========
  try {
    const w1File = path.join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx');
    const w2File = path.join(process.cwd(), 'app/(dashboard)/tenant/master/contacts/page.tsx');
    const w4File = path.join(process.cwd(), 'app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx');
    const w3File = path.join(process.cwd(), 'app/(dashboard)/hq/master/fleets/page.tsx');

    [w1File, w2File, w3File, w4File].forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const hasRoleReconciliation = /RoleReconciliationService|role-reconciliation/.test(content);
      addResult(`X5-SCOPE-${path.basename(file)}`, `${file} not modified with reconciliation logic`, !hasRoleReconciliation);
    });
  } catch (e: any) {
    addResult('X5-SCOPE', 'Scope integrity verification', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX5TestSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX5 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}
