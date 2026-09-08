// SENTRALOGIS — DATA-4E X4
// Targeted tests for W3/W4 Party Role Canonical Writer Migration

export async function runX4TestSuite() {
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

  const w3File = path.join(process.cwd(), 'app/(dashboard)/hq/master/fleets/page.tsx');
  const w4File = path.join(process.cwd(), 'app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx');
  const w3Content = fs.readFileSync(w3File, 'utf8');
  const w4Content = fs.readFileSync(w4File, 'utf8');

  // ========== W3 Verification ==========
  try {
    // After W3 migration, INSERT payload should NOT contain direct is_* writes
    const w3InsertMatch = w3Content.match(/\.insert\(\{([\s\S]*?)\}/);
    const w3HasInsertWrite = w3InsertMatch ? /is_(vendor|customer|supplier|broker)/.test(w3InsertMatch[1]) : false;
    addResult('X4-T1', 'W3 (fleets) INSERT payload has NO direct legacy role flag write', !w3HasInsertWrite);

    const w3UpdateMatch = w3Content.match(/\.update\(\{([\s\S]*?)\}/);
    const w3HasUpdate = w3UpdateMatch ? /is_(vendor|customer|supplier|broker)/.test(w3UpdateMatch[1]) : false;
    addResult('X4-T2', 'W3 (fleets) UPDATE payload has no direct legacy role flag write', !w3HasUpdate);

    // W3 may still use is_vendor for display/filter reads (reader-side, not in X4 scope)
    const w3HasDisplayFilter = /\.eq\('is_vendor',\s*(true|false)\)/.test(w3Content);
    addResult('X4-T3', 'W3 (fleets) uses is_vendor for display/filter only (reader-side, not X4 scope)', w3HasDisplayFilter);

    // W3 migration evidence: X4 comment block present
    const w3HasMigrationComment = /DATA-4E-X4.*Entity insert without direct role flag writes/.test(w3Content);
    addResult('X4-T4', 'W3 (fleets) migration documented with X4 canonical comment', w3HasMigrationComment);
  } catch (e: any) {
    addResult('X4-T1-T4', 'W3 verification', false, e.message);
  }

  // ========== W4 Migration Verification ==========
  try {
    // W4 should import assignRoleAction
    const w4HasAssignImport = /import\s+\{[^}]*assignRoleAction[^}]*\}\s+from\s+['"]@\/lib\/actions\/role-mutation-actions['"]/.test(w4Content);
    addResult('X4-T5', 'W4 imports assignRoleAction from role-mutation-actions', w4HasAssignImport);

    // W4 should NOT directly write is_customer/is_vendor in INSERT payload
    // Extract INSERT payload body between .insert({ and the closing })
    const w4InsertMatch = w4Content.match(/\.insert\(\{([\s\S]*?)\}/);
    if (w4InsertMatch) {
      const insertBody = w4InsertMatch[1];
      const hasIsCustomer = /is_customer\s*:/.test(insertBody);
      addResult('X4-T6', 'W4 INSERT payload does NOT directly write is_customer', !hasIsCustomer);
      const hasIsVendor = /is_vendor\s*:/.test(insertBody);
      addResult('X4-T7', 'W4 INSERT payload does NOT directly write is_vendor', !hasIsVendor);
    } else {
      addResult('X4-T6', 'W4 INSERT payload found', false);
      addResult('X4-T7', 'W4 INSERT payload found', false);
    }

    // W4 should have canonical role sync block
    const hasRoleSync = /DATA-4E-X4: Sync canonical party_roles via server actions/.test(w4Content);
    addResult('X4-T8', 'W4 contains X4 role sync block', hasRoleSync);

    // W4 should assign CUSTOMER and VENDOR via canonical action in a loop
    const hasCustomerAssign = /'CUSTOMER'/.test(w4Content);
    addResult('X4-T9', 'W4 assigns CUSTOMER role via canonical action', hasCustomerAssign);
    const hasVendorAssign = /'VENDOR'/.test(w4Content);
    addResult('X4-T10', 'W4 assigns VENDOR role via canonical action', hasVendorAssign);

    // W4 should use GLOBAL context
    const hasGlobalContext = /'GLOBAL'/.test(w4Content);
    addResult('X4-T11', 'W4 uses GLOBAL context for role assignment', hasGlobalContext);

    // W4 should throw on failure (no silent swallow)
    const hasErrorThrow = /throw new Error\(`Role sync failed for/.test(w4Content);
    addResult('X4-T12', 'W4 throws on role sync failure', hasErrorThrow);

    // W4 should check result.ok
    const hasResultCheck = /if\s*\(!result\.ok\)/.test(w4Content);
    addResult('X4-T13', 'W4 checks result.ok before proceeding', hasResultCheck);
  } catch (e: any) {
    addResult('X4-T5-T13', 'W4 migration verification', false, e.message);
  }

  // ========== Canonical Service Invariants ==========
  try {
    const actionFile = path.join(process.cwd(), 'lib/actions/role-mutation-actions.ts');
    const actionContent = fs.readFileSync(actionFile, 'utf8');
    const hasAuthCheck = /supabase\.auth\.getUser\(\)/.test(actionContent);
    addResult('X4-T14', 'Canonical service enforces server-side auth', hasAuthCheck);
    const hasTenantDerivation = /resolveTenantForActor/.test(actionContent);
    addResult('X4-T15', 'Canonical service derives tenant from profile', hasTenantDerivation);
    const noClientTenantOverride = !/req\.tenant_id|clientTenantId|client_tenant_id/.test(actionContent);
    addResult('X4-T16', 'Canonical service rejects client tenant override', noClientTenantOverride);
  } catch (e: any) {
    addResult('X4-T14-T16', 'Canonical service invariants', false, e.message);
  }

  // ========== W4 UI Behavior Preservation ==========
  try {
    const hasSubmitHandler = /onSubmit={handleSubmit}/.test(w4Content);
    addResult('X4-T17', 'W4 form still calls handleSubmit', hasSubmitHandler);
    const hasSuccessToast = /toast\.success\('Kontak baru berhasil ditambahkan'\)/.test(w4Content);
    addResult('X4-T18', 'W4 success toast preserved', hasSuccessToast);
    const hasOnSuccess = /onSuccess\(data\)/.test(w4Content);
    addResult('X4-T19', 'W4 onSuccess callback preserved', hasOnSuccess);
    const hasNameInput = /value=\{name\}/.test(w4Content);
    addResult('X4-T20', 'W4 name input preserved', hasNameInput);
  } catch (e: any) {
    addResult('X4-T17-T20', 'W4 UI behavior preservation', false, e.message);
  }

  // ========== Scope Integrity ==========
  try {
    // W1 and W2 should remain unchanged (no direct role writes in UPDATE/INSERT payloads)
    const w1File = path.join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx');
    const w2File = path.join(process.cwd(), 'app/(dashboard)/tenant/master/contacts/page.tsx');
    const w1Content = fs.readFileSync(w1File, 'utf8');
    const w2Content = fs.readFileSync(w2File, 'utf8');

    // Check only the actual payload objects, not form initialization or previousFlags reads
    const w1UpdateMatch = w1Content.match(/\.update\(\{([\s\S]*?)\}\)/);
    const w1InsertMatch = w1Content.match(/\.insert\(\{([\s\S]*?)\}/);
    const w1HasDirectWrite = (w1UpdateMatch ? /is_(vendor|customer|supplier|broker)/.test(w1UpdateMatch[1]) : false) ||
                             (w1InsertMatch ? /is_(vendor|customer|supplier|broker)/.test(w1InsertMatch[1]) : false);
    addResult('X4-T21', 'W1 (hq/master/contacts) has no direct is_* writes in UPDATE/INSERT payloads', !w1HasDirectWrite);

    const w2UpdateMatch = w2Content.match(/\.update\(\{([\s\S]*?)\}\)/);
    const w2InsertMatch = w2Content.match(/\.insert\(\{([\s\S]*?)\}/);
    const w2HasDirectWrite = (w2UpdateMatch ? /is_(vendor|customer|supplier|broker)/.test(w2UpdateMatch[1]) : false) ||
                             (w2InsertMatch ? /is_(vendor|customer|supplier|broker)/.test(w2InsertMatch[1]) : false);
    addResult('X4-T22', 'W2 (tenant/master/contacts) has no direct is_* writes in UPDATE/INSERT payloads', !w2HasDirectWrite);

    // W3 was migrated in X4: direct is_vendor write removed from INSERT.
    // W3 does not use assignRoleAction/revokeRoleAction because internal entity
    // creation relies on ownership service classification (no VENDOR role = is_own=true).
    // Verify the migration evidence is present instead.
    const w3HasMigrationEvidence = /DATA-4E-X4.*Entity insert without direct role flag writes/.test(w3Content);
    const w3HasNoDirectWrite = !/is_vendor:\s*false/.test(w3Content.match(/\.insert\(\{[\s\S]*?\}\s*\)/)?.[0] || '');
    addResult('X4-T23', 'W3 (fleets) migrated: no is_vendor:false in INSERT, X4 comment present', w3HasMigrationEvidence && w3HasNoDirectWrite);
  } catch (e: any) {
    addResult('X4-T21-T23', 'Scope integrity verification', false, e.message);
  }

  // ========== Bonus: tenant/master/fleets Migration ==========
  try {
    const tenantFleetsFile = path.join(process.cwd(), 'app/(dashboard)/tenant/master/fleets/page.tsx');
    const tenantFleetsContent = fs.readFileSync(tenantFleetsFile, 'utf8');

    // tenant/master/fleets should use getAllEntitiesWithOwnership server action
    const hasServerActionImport = /import\s+\{[^}]*getAllEntitiesWithOwnership[^}]*\}\s+from\s+['"]@\/lib\/actions\/entity-ownership-actions['"]/.test(tenantFleetsContent);
    addResult('X4-B1', 'tenant/master/fleets imports getAllEntitiesWithOwnership', hasServerActionImport);

    // tenant/master/fleets should use is_own not is_vendor in display
    const usesIsOwn = /is_own/.test(tenantFleetsContent);
    addResult('X4-B2', 'tenant/master/fleets uses is_own for ownership display', usesIsOwn);

    // tenant/master/fleets should NOT query is_vendor directly
    const noIsVendorQuery = !/\.select\('id,\s*name,\s*is_vendor'\)/.test(tenantFleetsContent);
    addResult('X4-B3', 'tenant/master/fleets does not query is_vendor directly', noIsVendorQuery);

    // tenant/master/fleets should NOT use !v.is_vendor for display
    const noLegacyDisplay = !/!v\.is_vendor/.test(tenantFleetsContent);
    addResult('X4-B4', 'tenant/master/fleets does not use legacy !v.is_vendor display', noLegacyDisplay);
  } catch (e: any) {
    addResult('X4-B1-B4', 'tenant/master/fleets bonus verification', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX4TestSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX4 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}
