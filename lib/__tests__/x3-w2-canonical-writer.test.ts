// SENTRALOGIS — DATA-4E X3
// Targeted tests for W2 Tenant Contacts Canonical Writer Migration

function path() { return require('path'); }

export async function runX3TestSuite() {
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

  const w2File = path.join(process.cwd(), 'app/(dashboard)/tenant/master/contacts/page.tsx');
  const w2Content = fs.readFileSync(w2File, 'utf8');

  // Extract handleSubmit code once for reuse
  const submitStart = w2Content.indexOf('const handleSubmit');
  const submitEnd = w2Content.indexOf('const handleDelete');
  const handleSubmitCode = w2Content.substring(submitStart, submitEnd);

  // ========== T1: W2 target routing ==========
  try {
    // Verify W2 imports the canonical server actions
    const hasAssignImport = /import\s+\{[^}]*assignRoleAction[^}]*\}\s+from\s+['"]@\/lib\/actions\/role-mutation-actions['"]/.test(w2Content);
    addResult('X3-T1', 'W2 imports assignRoleAction from role-mutation-actions', hasAssignImport);

    const hasRevokeImport = /import\s+\{[^}]*revokeRoleAction[^}]*\}\s+from\s+['"]@\/lib\/actions\/role-mutation-actions['"]/.test(w2Content);
    addResult('X3-T2', 'W2 imports revokeRoleAction from role-mutation-actions', hasRevokeImport);

    // Verify W2 calls assignRoleAction/revokeRoleAction in handleSubmit via ternary pattern
    const hasAssignCall = /const action = desired \? assignRoleAction : revokeRoleAction;/.test(handleSubmitCode);
    addResult('X3-T3', 'W2 routes assign/revoke through ternary to assignRoleAction/revokeRoleAction', hasAssignCall);

    const hasActionCall = /const result = await action\(/.test(handleSubmitCode);
    addResult('X3-T4', 'W2 calls the resolved action function', hasActionCall);
  } catch (e: any) {
    addResult('X3-T1-T4', 'W2 writer routing verification', false, e.message);
  }

  // ========== T2: No direct legacy mutation ==========
  try {
    // Parse the handleSubmit function to extract the code
    const submitStart = w2Content.indexOf('const handleSubmit');
    const submitEnd = w2Content.indexOf('const handleDelete');
    const handleSubmitCode = w2Content.substring(submitStart, submitEnd);

    // Extract entityData from UPDATE section (lines between .from('md_entities').update({ and .eq('id', selectedEntity.id))
    const updateMatch = handleSubmitCode.match(/\.from\('md_entities'\)\s*\.update\(\{([\s\S]*?)\}\)/);
    if (updateMatch) {
      const updateBody = updateMatch[1];
      const hasIsVendorInUpdate = /is_vendor\s*:/.test(updateBody);
      addResult('X3-T5', 'UPDATE does NOT directly write is_vendor', !hasIsVendorInUpdate);

      const hasIsCustomerInUpdate = /is_customer\s*:/.test(updateBody);
      addResult('X3-T6', 'UPDATE does NOT directly write is_customer', !hasIsCustomerInUpdate);

      const hasIsSupplierInUpdate = /is_supplier\s*:/.test(updateBody);
      addResult('X3-T7', 'UPDATE does NOT directly write is_supplier', !hasIsSupplierInUpdate);

      const hasIsBrokerInUpdate = /is_broker\s*:/.test(updateBody);
      addResult('X3-T8', 'UPDATE does NOT directly write is_broker', !hasIsBrokerInUpdate);
    } else {
      addResult('X3-T5-T8', 'Could not find UPDATE block', false);
    }

    // Extract INSERT section
    const insertMatch = handleSubmitCode.match(/\.from\('md_entities'\)\s*\.insert\(\{([\s\S]*?)\}\)/);
    if (insertMatch) {
      const insertBody = insertMatch[1];
      const hasIsVendorInInsert = /is_vendor\s*:/.test(insertBody);
      addResult('X3-T9', 'INSERT does NOT directly write is_vendor', !hasIsVendorInInsert);

      const hasIsCustomerInInsert = /is_customer\s*:/.test(insertBody);
      addResult('X3-T10', 'INSERT does NOT directly write is_customer', !hasIsCustomerInInsert);

      const hasIsSupplierInInsert = /is_supplier\s*:/.test(insertBody);
      addResult('X3-T11', 'INSERT does NOT directly write is_supplier', !hasIsSupplierInInsert);

      const hasIsBrokerInInsert = /is_broker\s*:/.test(insertBody);
      addResult('X3-T12', 'INSERT does NOT directly write is_broker', !hasIsBrokerInInsert);
    } else {
      addResult('X3-T9-T12', 'Could not find INSERT block', false);
    }

    // Verify role sync block exists in handleSubmit (not in handleDelete)
    const hasRoleSyncBlock = /DATA-4E-X3: Sync canonical party_roles via server actions/.test(handleSubmitCode);
    addResult('X3-T13', 'W2 contains X3 role sync block in handleSubmit', hasRoleSyncBlock);
  } catch (e: any) {
    addResult('X3-T5-T13', 'No direct legacy mutation check', false, e.message);
  }

  // ========== T3: Canonical role mapping ==========
  try {
    // Verify W2 uses the same mapping as W1
    const hasVendorMapping = /key: 'is_vendor',\s*canonical: 'VENDOR'/.test(w2Content);
    addResult('X3-T14', 'W2 maps is_vendor to VENDOR', hasVendorMapping);

    const hasCustomerMapping = /key: 'is_customer',\s*canonical: 'CUSTOMER'/.test(w2Content);
    addResult('X3-T15', 'W2 maps is_customer to CUSTOMER', hasCustomerMapping);

    const hasSupplierMapping = /key: 'is_supplier',\s*canonical: 'SUPPLIER'/.test(w2Content);
    addResult('X3-T16', 'W2 maps is_supplier to SUPPLIER', hasSupplierMapping);

    const hasBrokerMapping = /key: 'is_broker',\s*canonical: 'BROKER'/.test(w2Content);
    addResult('X3-T17', 'W2 maps is_broker to BROKER', hasBrokerMapping);
  } catch (e: any) {
    addResult('X3-T14-T17', 'Canonical mapping verification', false, e.message);
  }

  // ========== T4: Assignment routing ==========
  try {
    // Verify the resolved action is called with the canonical role and GLOBAL context
    const hasCanonicalCall = /await action\(.*r\.canonical.*'GLOBAL'/.test(handleSubmitCode);
    addResult('X3-T18', 'W2 routes role assignment through canonical action with role and context', hasCanonicalCall);

    // Verify GLOBAL context is used
    const hasGlobalContext = /'GLOBAL'/.test(handleSubmitCode);
    addResult('X3-T19', 'W2 uses GLOBAL context for canonical role assignment', hasGlobalContext);
  } catch (e: any) {
    addResult('X3-T18-T19', 'Assignment routing verification', false, e.message);
  }

  // ========== T5: Revocation routing ==========
  try {
    // Verify the ternary pattern for assign/revoke routing
    const hasTernaryPattern = /desired.*assignRoleAction.*revokeRoleAction/.test(handleSubmitCode);
    addResult('X3-T20', 'W2 uses ternary for assign/revoke routing', hasTernaryPattern);
  } catch (e: any) {
    addResult('X3-T20', 'Revocation routing verification', false, e.message);
  }

  // ========== T6: Authentication/tenant derivation (via server action) ==========
  try {
    // Verify server action exists and has auth check
    const actionFile = path.join(process.cwd(), 'lib/actions/role-mutation-actions.ts');
    const actionContent = fs.readFileSync(actionFile, 'utf8');

    const hasAuthCheck = /supabase\.auth\.getUser\(\)/.test(actionContent);
    addResult('X3-T22', 'Role mutation server action checks user auth', hasAuthCheck);

    const hasTenantDerivation = /resolveTenantForActor/.test(actionContent);
    addResult('X3-T23', 'Role mutation server action derives tenant from profile', hasTenantDerivation);

    const noClientTenantOverride = !/req\.tenant_id|clientTenantId|client_tenant_id/.test(actionContent);
    addResult('X3-T24', 'Server action does not accept client tenant override', noClientTenantOverride);
  } catch (e: any) {
    addResult('X3-T22-T24', 'Authentication/tenant verification', false, e.message);
  }

  // ========== T7: Error propagation ==========
  try {
    const submitStart = w2Content.indexOf('const handleSubmit');
    const submitEnd = w2Content.indexOf('const handleDelete');
    const handleSubmitCode = w2Content.substring(submitStart, submitEnd);

    // Verify error propagation exists
    const hasErrorThrow = /throw new Error\(`Role sync failed for/.test(handleSubmitCode);
    addResult('X3-T25', 'W2 throws on role sync failure (no silent swallow)', hasErrorThrow);

    // Verify result.ok check exists
    const hasResultCheck = /if\s*\(!result\.ok\)/.test(handleSubmitCode);
    addResult('X3-T26', 'W2 checks result.ok before proceeding', hasResultCheck);

    // Verify no fallback to direct write on error (no catch block with is_vendor/is_customer etc.)
    // The outer try-catch in handleSubmit only does console.error + toast.error - no DB writes
    const catchBlock = handleSubmitCode.match(/catch\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*finally/);
    const catchHasDbWrite = catchBlock ? /supabase\.from\(/.test(catchBlock[1]) : false;
    addResult('X3-T27', 'W2 catch block does NOT fall back to legacy direct write on error', !catchHasDbWrite);
  } catch (e: any) {
    addResult('X3-T25-T27', 'Error propagation verification', false, e.message);
  }

  // ========== T8: W2 behavior preservation ==========
  try {
    // Verify tab filtering still works
    const hasTabFiltering = /activeTab === 'customer'/.test(w2Content) &&
                            /activeTab === 'vendor'/.test(w2Content) &&
                            /activeTab === 'supplier'/.test(w2Content) &&
                            /activeTab === 'broker'/.test(w2Content);
    addResult('X3-T28', 'W2 tab filtering preserved', hasTabFiltering);

    // Verify badges still display
    const hasRoleBadges = /is_customer.*CUS|is_vendor.*VND|is_supplier.*SPP|is_broker.*BRO/.test(w2Content);
    addResult('X3-T29', 'W2 role badges preserved', hasRoleBadges);

    // Verify handleSubmit is called from Save button
    const hasSaveHandler = /onClick={handleSubmit}/.test(w2Content);
    addResult('X3-T30', 'W2 Save button still calls handleSubmit', hasSaveHandler);

    // Verify fetchEntities still called after success (toast.success precedes fetchEntities)
    const hasFetchAfterSuccess = /toast\.success\([^)]*\)[\s\S]{0,100}fetchEntities\(\)/.test(handleSubmitCode);
    addResult('X3-T31', 'W2 fetchEntities called after success', hasFetchAfterSuccess);
  } catch (e: any) {
    addResult('X3-T28-T31', 'W2 behavior preservation', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX3TestSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX3 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}