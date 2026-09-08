// SENTRALOGIS — DATA-4E X2.1
// Targeted tests for W1 HQ Contacts canonical role-mutation wiring
// NO FULL REGRESSION. NO DB CALLS.

import * as path from 'path';
import * as fs from 'fs';

function requireFromRoot(relativePath: string) {
  const projectRoot = process.cwd();
  return require(path.join(projectRoot, relativePath));
}

export async function runX21W1WiringSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  const w1Path = path.join(process.cwd(), 'app/(dashboard)/hq/master/contacts/page.tsx');
  const w1Src = fs.readFileSync(w1Path, 'utf8');

  // ---------- G1: W1 imports the canonical role-mutation actions ----------
  try {
    addResult('X21-G1', 'W1 imports assignRoleAction from role-mutation-actions', /import\s*\{[^}]*assignRoleAction[^}]*\}\s*from\s*['"]@\/lib\/actions\/role-mutation-actions['"]/.test(w1Src));
    addResult('X21-G2', 'W1 imports revokeRoleAction from role-mutation-actions', /import\s*\{[^}]*revokeRoleAction[^}]*\}\s*from\s*['"]@\/lib\/actions\/role-mutation-actions['"]/.test(w1Src));
  } catch (e: any) {
    addResult('X21-G1', 'W1 imports', false, e.message);
  }

  // ---------- G3: W1 no longer puts role booleans into entityData (the direct md_entities write) ----------
  // The entityData block must NOT contain is_vendor/is_customer/is_supplier/is_broker.
  // We check the entityData literal (lines around the original location).
  try {
    // Find the entityData literal and assert none of the 4 booleans appear inside it
    const entityDataMatch = w1Src.match(/const entityData = \{[\s\S]*?\};/);
    if (!entityDataMatch) {
      addResult('X21-G3', 'W1 entityData literal not found', false);
    } else {
      const lit = entityDataMatch[0];
      const hasIsVendor = /\bis_vendor\s*:/.test(lit);
      const hasIsCustomer = /\bis_customer\s*:/.test(lit);
      const hasIsSupplier = /\bis_supplier\s*:/.test(lit);
      const hasIsBroker = /\bis_broker\s*:/.test(lit);
      addResult('X21-G3', 'W1 entityData does NOT contain is_vendor', !hasIsVendor);
      addResult('X21-G4', 'W1 entityData does NOT contain is_customer', !hasIsCustomer);
      addResult('X21-G5', 'W1 entityData does NOT contain is_supplier', !hasIsSupplier);
      addResult('X21-G6', 'W1 entityData does NOT contain is_broker', !hasIsBroker);
    }
  } catch (e: any) {
    addResult('X21-G3', 'entityData audit', false, e.message);
  }

  // ---------- G4: W1 calls the canonical role-mutation action after entity save ----------
  try {
    addResult('X21-G7', 'W1 calls assignRoleAction', /assignRoleAction\s*\(/.test(w1Src));
    addResult('X21-G8', 'W1 calls revokeRoleAction', /revokeRoleAction\s*\(/.test(w1Src));
    addResult('X21-G9', 'W1 maps CUSTOMER to canonical role_type', /canonical:\s*['"]CUSTOMER['"]/.test(w1Src));
    addResult('X21-G10', 'W1 maps SUPPLIER to canonical role_type', /canonical:\s*['"]SUPPLIER['"]/.test(w1Src));
    addResult('X21-G11', 'W1 maps VENDOR to canonical role_type', /canonical:\s*['"]VENDOR['"]/.test(w1Src));
    addResult('X21-G12', 'W1 maps BROKER to canonical role_type', /canonical:\s*['"]BROKER['"]/.test(w1Src));
  } catch (e: any) {
    addResult('X21-G4', 'action call audit', false, e.message);
  }

  // ---------- G5: W1 surfaces role-sync errors (no silent swallow) ----------
  try {
    addResult('X21-G13', 'W1 throws on role-sync failure', /Role sync failed/.test(w1Src));
  } catch (e: any) {
    addResult('X21-G5', 'error propagation', false, e.message);
  }

  // ---------- G6: W1 does NOT contain a direct legacy fallback write ----------
  try {
    // Search for patterns that would indicate a direct fallback to md_entities.update with is_*
    // after the role-sync block. We check the new block doesn't contain a .update({ is_vendor: ...
    // The entityData block no longer contains is_*, so there should be no such fallback.
    // We do a simple grep: the new role-sync block must NOT have a .from('md_entities').update({is_...
    const directLegacyFallback = /\.from\(['"]md_entities['"]\)\.update\(\s*\{[^}]*is_(vendor|customer|supplier|broker)/.test(w1Src);
    addResult('X21-G14', 'W1 has no direct legacy role fallback write', !directLegacyFallback);
  } catch (e: any) {
    addResult('X21-G6', 'fallback audit', false, e.message);
  }

  // ---------- G7: tenant_id is NOT passed from W1 to the server action ----------
  try {
    // The server action derives tenantId from profile.tenant_id. W1 must NOT pass tenantId.
    // We check that the role-sync block does not pass a tenantId argument.
    const roleSyncBlock = w1Src.match(/if \(entityId\) \{[\s\S]*?const result = await action\(entityId[^)]*\);/);
    if (!roleSyncBlock) {
      addResult('X21-G15', 'role-sync block found', false);
    } else {
      const block = roleSyncBlock[0];
      // Should call action(entityId, r.canonical, 'GLOBAL', null) — 4 args, no tenantId
      const callMatch = block.match(/action\(entityId,\s*r\.canonical,\s*['"]GLOBAL['"],\s*null\)/);
      addResult('X21-G15', 'W1 server action call does not pass tenantId (server-derived)', !!callMatch);
    }
  } catch (e: any) {
    addResult('X21-G7', 'tenant isolation', false, e.message);
  }

  // ---------- G8: X1/X2 service is reachable ----------
  try {
    const svcMod = requireFromRoot('lib/domain/party/role-mutation-service');
    addResult('X21-G16', 'RoleMutationService is exported and importable from W1 dependency path', typeof svcMod.RoleMutationService === 'function');
    const actionsMod = requireFromRoot('lib/actions/role-mutation-actions');
    addResult('X21-G17', 'assignRoleAction is exported', typeof actionsMod.assignRoleAction === 'function');
    addResult('X21-G18', 'revokeRoleAction is exported', typeof actionsMod.revokeRoleAction === 'function');
  } catch (e: any) {
    addResult('X21-G8', 'service reachable', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX21W1WiringSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX2.1 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}
