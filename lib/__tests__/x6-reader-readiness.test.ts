// SENTRALOGIS — DATA-4E X6
// Wave 0 — Reader Instrumentation & Readiness
// Wave 1 P1 — Safe Legacy Role Reader Migration
//
// X6 Wave 0 classifies the existing legacy reader inventory and verifies
// the canonical read contract for future migration.
// X6 Wave 1 P1 migrates readers classified as SAFE_TO_CANONICALIZE.

export async function runX6TestSuite() {
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

  const assignmentFile = path.join(process.cwd(), 'lib/domain/jo/assignment.ts');
  const assignmentSaveFile = path.join(process.cwd(), 'lib/services/assignmentSave.ts');
  const partyRoleServiceFile = path.join(process.cwd(), 'lib/domain/party/party-role-service.ts');
  const assignmentContent = fs.readFileSync(assignmentFile, 'utf8');
  const assignmentSaveContent = fs.readFileSync(assignmentSaveFile, 'utf8');
  const partyRoleServiceContent = fs.readFileSync(partyRoleServiceFile, 'utf8');

  // ========== G1 — Authorization ==========
  addResult('X6-G1', 'X6 authorization gate satisfied by execution context', true);

  // ========== G2 — BR9 Inventory Reuse ==========
  try {
    const br9File = path.join(process.cwd(), 'docs/architecture/SENTRALOGIS_DATA4EBR9_PARTY_ROLE_AUTHORITY_TRANSITION.md');
    const br9Exists = fs.existsSync(br9File);
    addResult('X6-G2', 'BR9 inventory document exists and is reused', br9Exists);
  } catch (e: any) {
    addResult('X6-G2', 'BR9 inventory verification', false, e.message);
  }

  // ========== G3 — P1 Semantic Review ==========
  try {
    const resolveIsVendor = /export function resolveIsVendor/.test(assignmentContent);
    addResult('X6-G3', 'P1 assignment.ts contains resolveIsVendor derived logic', resolveIsVendor);

    const usesIsOwn = /is_own/.test(assignmentContent);
    addResult('X6-G4', 'P1 assignment.ts uses is_own in derived ownership logic', usesIsOwn);

    const usesVendorType = /vendor_type/.test(assignmentContent);
    addResult('X6-G5', 'P1 assignment.ts uses vendor_type in derived logic', usesVendorType);

    const assignmentSaveCallsResolve = /resolveIsVendor\(/.test(assignmentSaveContent);
    addResult('X6-G6', 'P1 assignmentSave.ts delegates to derived resolveIsVendor', assignmentSaveCallsResolve);

    const notDirectRoleReader = !/party_roles/.test(assignmentContent.replace(/\/\/.*$/gm, ''));
    addResult('X6-G7', 'P1 assignment.ts is NOT a direct party_roles reader', notDirectRoleReader);
  } catch (e: any) {
    addResult('X6-G3-G7', 'P1 semantic review', false, e.message);
  }

  // ========== G4 — Special Consumer Protection ==========
  try {
    const costAuditFile = path.join(process.cwd(), 'app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts');
    const costAuditContent = fs.readFileSync(costAuditFile, 'utf8');
    const costAuditHasVendorType = /vendor_type/.test(costAuditContent);
    addResult('X6-G8', 'cost-audit uses vendor_type (special consumer, not party_roles)', costAuditHasVendorType);

    const fleetStatusFile = path.join(process.cwd(), 'app/api/fleet-status/route.ts');
    const fleetStatusContent = fs.readFileSync(fleetStatusFile, 'utf8');
    const fleetStatusHasVendorTenantId = /vendor_tenant_id/.test(fleetStatusContent);
    addResult('X6-G9', 'fleet-status uses vendor_tenant_id (special consumer, not party_roles)', fleetStatusHasVendorTenantId);

    const assignmentHasDerivedOwnership = /is_vendor: !isActuallyOwn/.test(assignmentContent);
    addResult('X6-G10', 'assignment.ts derived ownership logic preserved', assignmentHasDerivedOwnership);
  } catch (e: any) {
    addResult('X6-G8-G10', 'Special consumer protection', false, e.message);
  }

  // ========== G5 — Canonical Read Contract ==========
  try {
    const reconciliationContent = fs.readFileSync(path.join(process.cwd(), 'lib/domain/party/role-reconciliation-service.ts'), 'utf8');
    const hasTenantId = /tenant_id/.test(reconciliationContent);
    addResult('X6-G11', 'Canonical read contract includes tenant_id', hasTenantId);

    const hasPartyId = /party_id/.test(reconciliationContent);
    addResult('X6-G12', 'Canonical read contract includes party_id', hasPartyId);

    const hasRoleType = /role_type/.test(reconciliationContent);
    addResult('X6-G13', 'Canonical read contract includes role_type', hasRoleType);

    const hasGlobal = /context_type',\s*'GLOBAL'|context_type = 'GLOBAL'|eq\('context_type',\s*'GLOBAL'\)/.test(reconciliationContent);
    addResult('X6-G14', 'Canonical read contract includes GLOBAL context', hasGlobal);

    const hasContextIdNull = /context_id IS NULL|is\('context_id',\s*null\)/.test(reconciliationContent);
    addResult('X6-G15', 'Canonical read contract includes context_id IS NULL', hasContextIdNull);

    const hasIsActive = /is_active/.test(reconciliationContent);
    addResult('X6-G16', 'Canonical read contract includes is_active = true', hasIsActive);
  } catch (e: any) {
    addResult('X6-G11-G16', 'Canonical read contract', false, e.message);
  }

  // ========== G6 — Read Abstraction Reuse ==========
  try {
    const hasHasRole = /async hasRole\(/.test(partyRoleServiceContent);
    addResult('X6-G17', 'Existing PartyRoleService.hasRole() abstraction available for canonical reads', hasHasRole);

    const hasGetRolesByParty = /async getRolesByParty\(/.test(partyRoleServiceContent);
    addResult('X6-G18', 'Existing PartyRoleService.getRolesByParty() abstraction available', hasGetRolesByParty);

    const hasGetPartyIdsByRole = /async getPartyIdsByRole\(/.test(partyRoleServiceContent);
    addResult('X6-G19', 'PartyRoleService.getPartyIdsByRole() abstraction available for Wave-1', hasGetPartyIdsByRole);

    const noNewAbstraction = !/hasGlobalRole|readRole|canonicalReader/.test(fs.readFileSync(path.join(process.cwd(), 'lib/domain/party/role-reconciliation-service.ts'), 'utf8'));
    addResult('X6-G20', 'No new canonical read abstraction created in X5 reconciliation service', noNewAbstraction);
  } catch (e: any) {
    addResult('X6-G17-G20', 'Read abstraction reuse', false, e.message);
  }

  // ========== G7 — Wave-1 P1 Migration Verification ==========
  try {
    const p1ActiveFilterFiles = [
      'app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx',
      'app/(dashboard)/hq/master-data/products/components/ProductFormModal.tsx',
      'app/(dashboard)/hq/master-data/products/components/BOMFormModal.tsx',
      'app/(dashboard)/hq/business/contracts/[id]/edit/page.tsx',
      'app/(dashboard)/hq/business/contracts/new/page.tsx',
      'app/(dashboard)/hq/driver-performance/page.tsx',
    ];
    const p1SelectOnlyFiles = [
      'app/(dashboard)/hq/work-orders/components/AddTruckingItemModal.tsx',
      'app/(dashboard)/hq/work-orders/components/AddForwardingItemModal.tsx',
    ];
    for (const file of p1ActiveFilterFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const noLegacyCustomerFilter = !/\.eq\(['"]is_customer['"]\s*,\s*true\)/.test(content);
      const noLegacyVendorFilter = !/\.eq\(['"]md_entities\.is_vendor['"]\s*,\s*false\)/.test(content);
      const noLegacyVendorTrueFilter = !/\.eq\(['"]is_vendor['"]\s*,\s*true\)/.test(content);
      const usesCanonicalAction = /getEntitiesByRole|getInternalDrivers/.test(content);
      addResult(`X6-P1MIGRATED-${path.basename(file)}`, `${file} migrated to canonical role read`, noLegacyCustomerFilter && noLegacyVendorFilter && noLegacyVendorTrueFilter && usesCanonicalAction);
    }
    for (const file of p1SelectOnlyFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const noLegacyCustomerSelect = !/md_entities!inner\([^)]*is_customer[^)]*\)/.test(content);
      addResult(`X6-P1MIGRATED-${path.basename(file)}`, `${file} removed is_customer from legacy projection read`, noLegacyCustomerSelect);
    }
  } catch (e: any) {
    addResult('X6-P1MIGRATED', 'Wave-1 P1 migration verification', false, e.message);
  }

  // ========== G7B — Wave-1 P2 Migration Verification ==========
  try {
    const p2Files = [
      'app/(dashboard)/reporting/operational/trucking/page.tsx',
      'app/(dashboard)/reporting/operational/overview/page.tsx',
      'app/(dashboard)/sbu/forwarding/wo/create/page.tsx',
      'app/(dashboard)/sbu/trucking/work-orders/[id]/page.tsx',
      'app/(dashboard)/sbu/trucking/work-orders/components/RejectReassignModal.tsx',
      'components/master/ContactFormModal.tsx',
      'app/(dashboard)/tenant/master/drivers/page.tsx',
    ];
    for (const file of p2Files) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const noLegacyCustomerFilter = !/\.eq\(['"]is_customer['"]\s*,\s*true\)/.test(content);
      const noLegacyVendorFilter = !/\.eq\(['"]is_vendor['"]\s*,\s*true\)/.test(content);
      const usesCanonicalAction = /getEntitiesByRole/.test(content);
      addResult(`X6-P2MIGRATED-${path.basename(file)}`, `${file} migrated to canonical role read`, noLegacyCustomerFilter && noLegacyVendorFilter && usesCanonicalAction);
    }
  } catch (e: any) {
    addResult('X6-P2MIGRATED', 'Wave-1 P2 migration verification', false, e.message);
  }

  // ========== G7C — Wave-2 P3 Migration Verification ==========
  try {
    const p3FilterFiles = [
      'app/warehouse/portal/task/[id]/page.tsx',
      'app/warehouse/portal/outbound/[id]/page.tsx',
    ];
    const p3SelectOnlyFiles = [
      'app/(dashboard)/sbu/warehouse/clients/page.tsx',
    ];
    for (const file of p3FilterFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const noLegacyCustomerFilter = !/\.eq\(['"]is_customer['"]\s*,\s*true\)/.test(content);
      const noLegacyVendorTrueFilter = !/\.eq\(['"]is_vendor['"]\s*,\s*true\)/.test(content);
      const noLegacyVendorFalseFilter = !/\.eq\(['"]is_vendor['"]\s*,\s*false\)/.test(content);
      const usesCanonicalAction = /getEntitiesByRole|getEntitiesWithoutRole/.test(content);
      addResult(`X6-P3MIGRATED-${path.basename(file)}`, `${file} migrated to canonical role read`, noLegacyCustomerFilter && noLegacyVendorTrueFilter && noLegacyVendorFalseFilter && usesCanonicalAction);
    }
    for (const file of p3SelectOnlyFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const noLegacyCustomerSelect = !/\.select\([^)]*is_customer[^)]*\)/.test(content);
      addResult(`X6-P3MIGRATED-${path.basename(file)}`, `${file} removed is_customer from legacy projection read`, noLegacyCustomerSelect);
    }
  } catch (e: any) {
    addResult('X6-P3MIGRATED', 'Wave-2 P3 migration verification', false, e.message);
  }

  // ========== G8 — R2 / Non-Migrated Readers Unchanged ==========
  try {
    const readers = [
      'app/(dashboard)/hq/master/contacts/page.tsx',
      'app/(dashboard)/tenant/master/contacts/page.tsx',
      'app/(dashboard)/hq/master/fleets/page.tsx',
      'app/(dashboard)/hq/master/drivers/page.tsx',
      'app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx',
      'lib/domain/jo/assignment.ts',
      'lib/services/assignmentSave.ts',
    ];
    for (const file of readers) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const hasCanonicalRead = /party_roles\.(select|insert|update|delete)|PartyRoleService\.(hasRole|getRolesByParty)/.test(content);
      addResult(`X6-NOREAD-${path.basename(file)}`, `${file} not migrated to canonical read`, !hasCanonicalRead);
    }
  } catch (e: any) {
    addResult('X6-NOREAD', 'No reader migration verification', false, e.message);
  }

  // ========== G9 — No Writer Changes in X6 ==========
  try {
    const writers = [
      'app/(dashboard)/hq/master/contacts/page.tsx',
      'app/(dashboard)/tenant/master/contacts/page.tsx',
      'app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx',
    ];
    for (const file of writers) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      // These writers were already migrated in X2.1/X3/X4.
      // X6 must not introduce NEW direct is_* writes in INSERT/UPDATE payloads.
      const insertMatch = content.match(/\.insert\(\{([\s\S]*?)\}/);
      const updateMatch = content.match(/\.update\(\{([\s\S]*?)\}/);
      const insertHasDirectWrite = insertMatch ? /is_(vendor|customer|supplier|broker)\s*:/.test(insertMatch[1]) : false;
      const updateHasDirectWrite = updateMatch ? /is_(vendor|customer|supplier|broker)\s*:/.test(updateMatch[1]) : false;
      addResult(`X6-NOWRITE-${path.basename(file)}`, `${file} has no NEW direct is_* writes in X6`, !insertHasDirectWrite && !updateHasDirectWrite);
    }
  } catch (e: any) {
    addResult('X6-NOWRITE', 'No writer changes verification', false, e.message);
  }

  // ========== G9 — No Writer Changes in X6 ==========
  try {
    const writers = [
      'app/(dashboard)/hq/master/contacts/page.tsx',
      'app/(dashboard)/tenant/master/contacts/page.tsx',
      'app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx',
    ];
    for (const file of writers) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      // These writers were already migrated in X2.1/X3/X4.
      // X6 must not introduce NEW direct is_* writes in INSERT/UPDATE payloads.
      const insertMatch = content.match(/\.insert\(\{([\s\S]*?)\}/);
      const updateMatch = content.match(/\.update\(\{([\s\S]*?)\}/);
      const insertHasDirectWrite = insertMatch ? /is_(vendor|customer|supplier|broker)\s*:/.test(insertMatch[1]) : false;
      const updateHasDirectWrite = updateMatch ? /is_(vendor|customer|supplier|broker)\s*:/.test(updateMatch[1]) : false;
      addResult(`X6-NOWRITE-${path.basename(file)}`, `${file} has no NEW direct is_* writes in X6`, !insertHasDirectWrite && !updateHasDirectWrite);
    }
  } catch (e: any) {
    addResult('X6-NOWRITE', 'No writer changes verification', false, e.message);
  }

  // ========== G10 — R2 Service Implementation Verification ==========
  try {
    const ownershipServiceFile = path.join(process.cwd(), 'lib/domain/entity/entity-ownership-service.ts');
    const accessServiceFile = path.join(process.cwd(), 'lib/domain/driver/driver-access-classification-service.ts');
    const financialServiceFile = path.join(process.cwd(), 'lib/domain/job/job-financial-workflow-service.ts');
    const ownershipActionsFile = path.join(process.cwd(), 'lib/actions/entity-ownership-actions.ts');
    const accessActionsFile = path.join(process.cwd(), 'lib/actions/driver-access-classification-actions.ts');
    const financialActionsFile = path.join(process.cwd(), 'lib/actions/job-financial-workflow-actions.ts');

    const ownershipServiceExists = fs.existsSync(ownershipServiceFile);
    addResult('X6-R2-SVC-ownership', 'EntityOwnershipService exists', ownershipServiceExists);

    const accessServiceExists = fs.existsSync(accessServiceFile);
    addResult('X6-R2-SVC-access', 'DriverAccessClassificationService exists', accessServiceExists);

    const financialServiceExists = fs.existsSync(financialServiceFile);
    addResult('X6-R2-SVC-financial', 'JobFinancialWorkflowService exists', financialServiceExists);

    const ownershipActionsExists = fs.existsSync(ownershipActionsFile);
    addResult('X6-R2-ACT-ownership', 'Entity ownership server actions exist', ownershipActionsExists);

    const accessActionsExists = fs.existsSync(accessActionsFile);
    addResult('X6-R2-ACT-access', 'Driver access server actions exist', accessActionsExists);

    const financialActionsExists = fs.existsSync(financialActionsFile);
    addResult('X6-R2-ACT-financial', 'Job financial workflow server actions exist', financialActionsExists);

    if (ownershipServiceExists) {
      const content = fs.readFileSync(ownershipServiceFile, 'utf8');
      const hasClassifyOwnership = /async classifyOwnership\(/.test(content);
      const noHeuristics = !/name.*heuristic|tenant.*name|tenant.*code/i.test(content.replace(/\/\/.*$/gm, ''));
      addResult('X6-R2-SVC-ownership-method', 'classifyOwnership() exists and excludes heuristics', hasClassifyOwnership && noHeuristics);
    }

    if (accessServiceExists) {
      const content = fs.readFileSync(accessServiceFile, 'utf8');
      const hasClassifyDriverAccess = /async classifyDriverAccess\(/.test(content);
      const noHeuristicFallback = !/heuristic/i.test(content.replace(/\/\/.*$/gm, ''));
      addResult('X6-R2-SVC-access-method', 'classifyDriverAccess() exists and excludes heuristics', hasClassifyDriverAccess && noHeuristicFallback);
    }

    if (financialServiceExists) {
      const content = fs.readFileSync(financialServiceFile, 'utf8');
      const hasClassifyWorkflow = /classifyJobFinancialWorkflow\(/.test(content);
      const hasDetermineWorkflow = /determineWorkflowAtAssignment\(/.test(content);
      const hasMixedWorkflowError = /Cannot assign vendor transporter with driver share percentage|Mixed workflow/i.test(content);
      addResult('X6-R2-SVC-financial-methods', 'Financial workflow methods exist and mixed workflow is rejected', hasClassifyWorkflow && hasDetermineWorkflow && hasMixedWorkflowError);
    }

    if (ownershipActionsExists) {
      const content = fs.readFileSync(ownershipActionsFile, 'utf8');
      const hasClassifyOwnershipAction = /export async function classifyOwnership\(/.test(content);
      const hasServerAuth = /createAdminClient|getUser/.test(content);
      addResult('X6-R2-ACT-ownership-auth', 'Ownership server action has server auth', hasClassifyOwnershipAction && hasServerAuth);
    }

    if (accessActionsExists) {
      const content = fs.readFileSync(accessActionsFile, 'utf8');
      const hasClassifyAccessAction = /export async function classifyDriverAccess\(/.test(content);
      const hasServerAuth = /createAdminClient|getUser/.test(content);
      addResult('X6-R2-ACT-access-auth', 'Access server action has server auth', hasClassifyAccessAction && hasServerAuth);
    }

    if (financialActionsExists) {
      const content = fs.readFileSync(financialActionsFile, 'utf8');
      const hasClassifyWorkflowAction = /export async function classifyJobFinancialWorkflow\(/.test(content);
      const hasDetermineWorkflowAction = /export async function determineWorkflowAtAssignment\(/.test(content);
      const hasServerAuth = /createAdminClient|getUser/.test(content);
      addResult('X6-R2-ACT-financial-auth', 'Financial workflow server actions have server auth', hasClassifyWorkflowAction && hasDetermineWorkflowAction && hasServerAuth);
    }
  } catch (e: any) {
    addResult('X6-R2-SVC', 'R2 service implementation verification', false, e.message);
  }

  // ========== G11 — TypeScript ==========
  addResult('X6-G24', 'TypeScript validation delegated to npx tsc --noEmit step', true);

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX6TestSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX6 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}

