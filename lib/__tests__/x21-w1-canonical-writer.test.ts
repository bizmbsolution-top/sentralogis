// SENTRALOGIS — DATA-4E X2.1
// Targeted tests for W1 HQ Contacts Canonical Writer Migration
// Verifies that W1 routes role mutations through X2 canonical service

function requireFromRoot(relativePath: string) {
  const path = require('path');
  const projectRoot = process.cwd();
  return require(path.join(projectRoot, relativePath));
}

async function runX21TestSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  // ========== T1: W1 writer routing test ==========
  // Verify that W1 routes role mutations through X2 canonical server actions
  try {
    const path = require('path');
    const fs = require('fs');
    const pageContent = fs.readFileSync(
      path.join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx'),
      'utf8'
    );

    // Verify import of assignRoleAction and revokeRoleAction
    const hasImport = /import\s+\{[^}]*assignRoleAction[^}]*\}\s+from\s+['"]@\/lib\/actions\/role-mutation-actions['"]/.test(pageContent);
    addResult('X21-T1', 'W1 imports assignRoleAction from role-mutation-actions', hasImport);

    const hasImportRevoke = /import\s+\{[^}]*revokeRoleAction[^}]*\}\s+from\s+['"]@\/lib\/actions\/role-mutation-actions['"]/.test(pageContent);
    addResult('X21-T2', 'W1 imports revokeRoleAction from role-mutation-actions', hasImportRevoke);

    // Verify role sync block exists
    const hasRoleSyncBlock = /DATA-4E-X2\.1: Sync canonical party_roles via server actions/.test(pageContent);
    addResult('X21-T3', 'W1 contains X2.1 role sync block', hasRoleSyncBlock);

    // Verify role mapping is correct
    const hasCorrectMapping = /\{ key: 'is_vendor', canonical: 'VENDOR' \}/.test(pageContent);
    addResult('X21-T4', 'W1 maps is_vendor to VENDOR', hasCorrectMapping);

    const hasCorrectMapping2 = /\{ key: 'is_customer', canonical: 'CUSTOMER' \}/.test(pageContent);
    addResult('X21-T5', 'W1 maps is_customer to CUSTOMER', hasCorrectMapping2);

    const hasCorrectMapping3 = /\{ key: 'is_supplier', canonical: 'SUPPLIER' \}/.test(pageContent);
    addResult('X21-T6', 'W1 maps is_supplier to SUPPLIER', hasCorrectMapping3);

    const hasCorrectMapping4 = /\{ key: 'is_broker', canonical: 'BROKER' \}/.test(pageContent);
    addResult('X21-T7', 'W1 maps is_broker to BROKER', hasCorrectMapping4);
  } catch (e: any) {
    addResult('X21-T1-T7', 'W1 writer routing verification', false, e.message);
  }

  // ========== T2: No direct legacy mutation test ==========
  // Verify that W1 does NOT directly write is_vendor/is_customer/is_supplier/is_broker
  try {
    const path = require('path');
    const fs = require('fs');
    const pageContent = fs.readFileSync(
      path.join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx'),
      'utf8'
    );

    // Check that entityData object does NOT include role flags (lines 252-273 area)
    // The entityData is used in update/insert operations
    const entityDataMatch = pageContent.match(/const entityData\s*=\s*\{[^}]+\}/s);
    const entityDataStr = entityDataMatch ? entityDataMatch[0] : '';

    // Verify role flags are NOT in entityData for direct write
    const hasDirectVendorWrite = /is_vendor.*formData\.is_vendor/.test(entityDataStr);
    addResult('X21-T8', 'W1 does NOT directly write is_vendor in entityData', !hasDirectVendorWrite);

    const hasDirectCustomerWrite = /is_customer.*formData\.is_customer/.test(entityDataStr);
    addResult('X21-T9', 'W1 does NOT directly write is_customer in entityData', !hasDirectCustomerWrite);

    const hasDirectSupplierWrite = /is_supplier.*formData\.is_supplier/.test(entityDataStr);
    addResult('X21-T10', 'W1 does NOT directly write is_supplier in entityData', !hasDirectSupplierWrite);

    const hasDirectBrokerWrite = /is_broker.*formData\.is_broker/.test(entityDataStr);
    addResult('X21-T11', 'W1 does NOT directly write is_broker in entityData', !hasDirectBrokerWrite);
  } catch (e: any) {
    addResult('X21-T8-T11', 'No direct legacy mutation check', false, e.message);
  }

  // ========== T3: Canonical mapping test ==========
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    const LEGACY_BOOLEAN_BY_ROLE = {
      VENDOR: 'is_vendor',
      CUSTOMER: 'is_customer',
      SUPPLIER: 'is_supplier',
      BROKER: 'is_broker',
    };

    // Verify the mapping exists in role-mutation-service.ts
    const fs = require('fs');
    const serviceContent = fs.readFileSync(
      require('path').join(process.cwd(), 'lib/domain/party/role-mutation-service.ts'),
      'utf8'
    );

    const hasVendorMapping = serviceContent.includes("VENDOR: 'is_vendor'");
    addResult('X21-T12', 'RoleMutationService has VENDOR→is_vendor mapping', hasVendorMapping);

    const hasCustomerMapping = serviceContent.includes("CUSTOMER: 'is_customer'");
    addResult('X21-T13', 'RoleMutationService has CUSTOMER→is_customer mapping', hasCustomerMapping);

    const hasSupplierMapping = serviceContent.includes("SUPPLIER: 'is_supplier'");
    addResult('X21-T14', 'RoleMutationService has SUPPLIER→is_supplier mapping', hasSupplierMapping);

    const hasBrokerMapping = serviceContent.includes("BROKER: 'is_broker'");
    addResult('X21-T15', 'RoleMutationService has BROKER→is_broker mapping', hasBrokerMapping);
  } catch (e: any) {
    addResult('X21-T12-T15', 'Canonical mapping verification', false, e.message);
  }

  // ========== T4: Server action file verification ==========
  try {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(process.cwd(), 'lib/actions/role-mutation-actions.ts'),
      'utf8'
    );

    addResult('X21-T16', 'Server action has use server directive', src.includes("'use server'"));
    addResult('X21-T17', 'Server action exports assignRoleAction', /export async function assignRoleAction/.test(src));
    addResult('X21-T18', 'Server action exports revokeRoleAction', /export async function revokeRoleAction/.test(src));
    addResult('X21-T19', 'Server action exports assignVendorRoleAction', /export async function assignVendorRoleAction/.test(src));
    addResult('X21-T20', 'Server action exports revokeVendorRoleAction', /export async function revokeVendorRoleAction/.test(src));
    addResult('X21-T21', 'Server action uses createAdminClient', /createAdminClient/.test(src));
  } catch (e: any) {
    addResult('X21-T16-T21', 'Server action module verification', false, e.message);
  }

  // ========== T5: Error propagation test ==========
  // Verify that when role sync fails, an error is thrown
  try {
    const fs = require('fs');
    const pageContent = fs.readFileSync(
      require('path').join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx'),
      'utf8'
    );

    // Verify error handling exists after role sync
    const hasErrorThrow = /throw new Error\(`Role sync failed for/.test(pageContent);
    addResult('X21-T22', 'W1 throws error when role sync fails', hasErrorThrow);

    // Verify result.ok check exists
    const hasResultCheck = /result\.ok/.test(pageContent);
    addResult('X21-T23', 'W1 checks result.ok from role action', hasResultCheck);
  } catch (e: any) {
    addResult('X21-T22-T23', 'Error propagation verification', false, e.message);
  }

  // ========== T6: W1 UI behavior preservation test ==========
  try {
    const fs = require('fs');
    const pageContent = fs.readFileSync(
      require('path').join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx'),
      'utf8'
    );

    // Verify that tab filtering still works (read-only)
    const hasTabFiltering = /activeTab === 'customer'/.test(pageContent) &&
                            /activeTab === 'vendor'/.test(pageContent);
    addResult('X21-T24', 'W1 tab filtering preserved', hasTabFiltering);

    // Verify that badges still display correctly
    const hasBadges = /is_vendor &&.*Badge.*Vendor/.test(pageContent);
    addResult('X21-T25', 'W1 role badges preserved', hasBadges);

    // Verify entity form submission is preserved
    const hasFormSubmission = /handleSubmit/.test(pageContent);
    addResult('X21-T26', 'W1 form submission handler preserved', hasFormSubmission);
  } catch (e: any) {
    addResult('X21-T24-T26', 'UI behavior preservation', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX21TestSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX2.1 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}