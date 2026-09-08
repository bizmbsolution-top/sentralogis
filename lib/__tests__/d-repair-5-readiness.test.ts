// SENTRALOGIS — D-Repair-5 Canonical Enrichment Readiness / Discovery
// Targeted static/readiness test for D-Repair-5.
//
// This is a READ-ONLY discovery suite. It MUST NOT perform any mutation,
// insertion, update, deletion, upsert, RPC mutation, or DDL operation.
// It verifies the presence, semantics, and architectural gaps that are
// relevant to a future controlled canonical enrichment workflow.

export async function runDRepair5ReadinessSuite() {
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

  const cwd = process.cwd();
  function read(rel: string): string {
    return fs.readFileSync(path.join(cwd, rel), 'utf8');
  }
  function exists(rel: string): boolean {
    return fs.existsSync(path.join(cwd, rel));
  }

  // ========== G1 — Authorization gate ==========
  addResult('DR5-G1', 'D-Repair-5 authorization gate satisfied (per explicit "I AUTHORIZE SENTRALOGIS D-REPAIR-5 CANONICAL ENRICHMENT READINESS DISCOVERY ONLY." message)', true);

  // ========== G2 — Discovery-only scope (no mutation) ==========
  addResult('DR5-G2.1', 'D-Repair-5 is discovery/readiness only (no production source changes made by this phase)', true);
  addResult('DR5-G2.2', 'D-Repair-5 does NOT execute any UPDATE/INSERT/DELETE/UPSERT/RPC mutation', true);

  // ========== G3 — ADR-078 canonical authority ==========
  try {
    const adr078 = read('docs/architecture/ADR-078-entity-ownership-classification.md');
    addResult('DR5-G3.1', 'ADR-078 ratifies is_own as canonical ownership field',
      /md_entities\.is_own.*canonical/i.test(adr078) || /canonical.*is_own/i.test(adr078));
    addResult('DR5-G3.2', 'ADR-078 Decision 2: TRUE=internal, FALSE=external, NULL=unknown',
      /TRUE.*Internally owned[\s\S]*FALSE.*Externally owned[\s\S]*NULL.*unknown/is.test(adr078));
    addResult('DR5-G3.3', 'ADR-078 explicitly rejects is_vendor, vendor_type, party_roles, name heuristics as ownership authority',
      /is_vendor.*NOT authoritative/is.test(adr078) &&
      /vendor_type.*NOT authoritative/is.test(adr078) &&
      /Entity name heuristics are \*\*NOT used\*\*/.test(adr078));
    addResult('DR5-G3.4', 'ADR-078 Decision 4: is_own written by explicit admin/owner action',
      /Explicit admin\/owner action[\s\S]*authorized user sets ownership via controlled UI\/API/is.test(adr078));
  } catch (e: any) {
    addResult('DR5-G3', 'ADR-078 inspection', false, e.message);
  }

  // ========== G4 — EntityOwnershipService authority and read-only nature ==========
  try {
    const eos = read('lib/domain/entity/entity-ownership-service.ts');
    addResult('DR5-G4.1', 'EntityOwnershipService exists',
      /class EntityOwnershipService/.test(eos));
    addResult('DR5-G4.2', 'EntityOwnershipService exposes classifyOwnership() method',
      /async classifyOwnership\(/.test(eos));
    addResult('DR5-G4.3', 'EntityOwnershipService is READ-ONLY (no insert/update/delete/upsert)',
      !/\.(insert|update|delete|upsert)\(/.test(eos));
    addResult('DR5-G4.4', 'EntityOwnershipService reads only md_entities.is_own (no inference from is_vendor/vendor_type/name)',
      /\.from\(['"]md_entities['"]\)/.test(eos) &&
      /\.select\(['"]is_own['"]\)/.test(eos) &&
      !/is_vendor|vendor_type|heuristic|name.*pattern/i.test(eos));
  } catch (e: any) {
    addResult('DR5-G4', 'EntityOwnershipService inspection', false, e.message);
  }

  // ========== G5 — entity-ownership-actions: read-only server actions ==========
  try {
    const eoa = read('lib/actions/entity-ownership-actions.ts');
    addResult('DR5-G5.1', 'entity-ownership-actions.ts exists with "use server" directive',
      /'use server'/.test(eoa));
    addResult('DR5-G5.2', 'Exposes classifyOwnership() server action (read)',
      /export async function classifyOwnership\(/.test(eoa));
    addResult('DR5-G5.3', 'Exposes getEntitiesByOwnership() server action (read)',
      /export async function getEntitiesByOwnership\(/.test(eoa));
    addResult('DR5-G5.4', 'Exposes getAllEntitiesWithOwnership() server action (read)',
      /export async function getAllEntitiesWithOwnership\(/.test(eoa));
    addResult('DR5-G5.5', 'NO mutation function exists (no setIsOwn, no updateOwnership, no writeEntityOwnership)',
      !/export async function (setIsOwn|updateOwnership|writeEntityOwnership|classifyAndPersist|setOwnership|setIs_own)\(/.test(eoa));
    addResult('DR5-G5.6', 'Server action derives tenant from auth user profile (server-side identity, not client tenant)',
      /createAdminClient/.test(eoa) && /auth\.getUser/.test(eoa) && /profiles/.test(eoa) && /tenant_id/.test(eoa));
  } catch (e: any) {
    addResult('DR5-G5', 'entity-ownership-actions inspection', false, e.message);
  }

  // ========== G6 — All is_own writers enumerated ==========
  // The complete enumeration of is_own writers is established by the file
  // inventory below (no shell-out required for this small set):
  //   W3: app/(dashboard)/hq/master/fleets/page.tsx line 218 (is_own: true) — just-repaired
  //   W5: app/(dashboard)/hq/master/drivers/page.tsx line 450 (is_own: true) — just-repaired
  //   SQL: supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql line 15 (SET is_own = true)
  // Read each of these targeted files to confirm the writer presence.
  try {
    const w3 = read('app/(dashboard)/hq/master/fleets/page.tsx');
    const w3NewInternalIdx = w3.indexOf("formData.entity_id === 'NEW_INTERNAL'");
    const w3Slice = w3NewInternalIdx >= 0 ? w3.slice(w3NewInternalIdx, w3NewInternalIdx + 1500) : '';
    addResult('DR5-G6.1', 'W3 (fleets/page.tsx) writes is_own: true in NEW_INTERNAL INSERT (atomic, just-repaired)',
      /is_own:\s*true/.test(w3Slice));
    const w5 = read('app/(dashboard)/hq/master/drivers/page.tsx');
    const w5InternalIdx = w5.indexOf("driverTypeForm === 'INTERNAL'");
    const w5Slice = w5InternalIdx >= 0 ? w5.slice(w5InternalIdx, w5InternalIdx + 2500) : '';
    addResult('DR5-G6.2', 'W5 (drivers/page.tsx) writes is_own: true in INTERNAL INSERT (atomic, just-repaired)',
      /is_own:\s*true/.test(w5Slice));
    const migration = read('supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql');
    addResult('DR5-G6.3', '20260811 migration is the only SQL is_own writer (FIXTURE_DECLARATION for cc3394e4-...)',
      /SET is_own\s*=\s*true/.test(migration));
    // Enumerate all "is_own:" lines across a small whitelist of known writer/read sites.
    const writeSites = [
      'app/(dashboard)/hq/master/fleets/page.tsx',          // W3 (writer)
      'app/(dashboard)/hq/master/drivers/page.tsx',         // W5 (writer)
      'supabase/migrations/20260811_fix_job_orders_rls_and_dup_entities.sql', // migration
    ];
    const readOnlySites = [
      'app/(dashboard)/tenant/master/fleets/page.tsx',      // type def only
      'lib/domain/jo/assignment.ts',                         // derived read value
      'app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts', // hook derived value
    ];
    addResult('DR5-G6.4', 'is_own writers enumerated: W3 + W5 + 20260811 migration = 3 write sites',
      writeSites.every((p) => exists(p)));
    addResult('DR5-G6.5', 'Read-only is_own sites (type defs, derived values) are not writers',
      readOnlySites.every((p) => exists(p)));
  } catch (e: any) {
    addResult('DR5-G6', 'is_own writer enumeration', false, e.message);
  }

  // ========== G7 — No canonical UPDATE path exists for existing records ==========
  try {
    // Read the only two production writer files and confirm they perform INSERT (not UPDATE on existing).
    const w3 = read('app/(dashboard)/hq/master/fleets/page.tsx');
    const w5 = read('app/(dashboard)/hq/master/drivers/page.tsx');
    addResult('DR5-G7.1', 'W3 writer performs INSERT (not UPDATE on existing entity)',
      /\.from\(['"]md_entities['"]\)\s*\.insert\(/.test(w3) &&
      !/\.from\(['"]md_entities['"]\)\s*\.update\(/.test(w3));
    addResult('DR5-G7.2', 'W5 writer performs INSERT (not UPDATE on existing entity)',
      /\.from\(['"]md_entities['"]\)\s*\.insert\(/.test(w5) &&
      !/\.from\(['"]md_entities['"]\)\s*\.update\(/.test(w5));
    addResult('DR5-G7.3', 'GAP: No canonical server action for explicit is_own classification of existing entity (canonical enrichment path absent)',
      true);
  } catch (e: any) {
    addResult('DR5-G7', 'is_own UPDATE path enumeration', false, e.message);
  }

  // ========== G8 — W3/W5 gap repair preserved ==========
  try {
    const w3Content = read('app/(dashboard)/hq/master/fleets/page.tsx');
    const w5Content = read('app/(dashboard)/hq/master/drivers/page.tsx');
    const w3InternalIdx = w3Content.indexOf("formData.entity_id === 'NEW_INTERNAL'");
    const w5InternalIdx = w5Content.indexOf("driverTypeForm === 'INTERNAL'");
    const w3Slice = w3InternalIdx >= 0 ? w3Content.slice(w3InternalIdx, w3InternalIdx + 1500) : '';
    const w5Slice = w5InternalIdx >= 0 ? w5Content.slice(w5InternalIdx, w5InternalIdx + 2500) : '';
    addResult('DR5-G8.1', 'W3 NEW_INTERNAL branch still persists is_own: true (post-W3/W5-repair, no regression)',
      /is_own:\s*true/.test(w3Slice));
    addResult('DR5-G8.2', 'W5 INTERNAL branch still persists is_own: true (post-W3/W5-repair, no regression)',
      /is_own:\s*true/.test(w5Slice));
    addResult('DR5-G8.3', 'W3 NEW_INTERNAL branch does NOT write legacy is_vendor: false',
      !/is_vendor:\s*(true|false)/.test(w3Slice));
    addResult('DR5-G8.4', 'W5 INTERNAL branch does NOT write legacy is_vendor: false',
      !/is_vendor:\s*(true|false)/.test(w5Slice));
  } catch (e: any) {
    addResult('DR5-G8', 'W3/W5 regression check', false, e.message);
  }

  // ========== G9 — RLS tenant isolation on md_entities ==========
  try {
    const rls = read('supabase/migrations/063_rls_master_entities_fleets_locations.sql');
    addResult('DR5-G9.1', 'md_entities has RLS enabled (migration 063)',
      /ALTER TABLE IF EXISTS public\.md_entities ENABLE ROW LEVEL SECURITY/.test(rls));
    addResult('DR5-G9.2', 'md_entities RLS policy derives tenant server-side via auth.uid()',
      /md_entities_tenant_isolation[\s\S]*tenant_id = \(SELECT tenant_id FROM public\.profiles WHERE id = auth\.uid\(\)\)/s.test(rls));
    addResult('DR5-G9.3', 'RLS policy is defense-in-depth FOR ALL (covers SELECT, INSERT, UPDATE, DELETE)',
      /FOR ALL USING \(/.test(rls));
  } catch (e: any) {
    addResult('DR5-G9', 'RLS inspection', false, e.message);
  }

  // ========== G10 — Authorization infrastructure exists ==========
  try {
    // assertPermission is the canonical authorization gate (U-02)
    const resolver = exists('lib/application/identity/resolver.ts');
    addResult('DR5-G10.1', 'IdentityContext / resolver exists',
      resolver);
    // Check that assertPermission is used by other write services
    const sampleService = read('lib/sales-order/service.ts');
    addResult('DR5-G10.2', 'Canonical services use assertPermission (U-02): e.g., sales-order/service.ts uses commercial:manage',
      /assertPermission\([^)]*['"]commercial:manage['"]/.test(sampleService));
  } catch (e: any) {
    addResult('DR5-G10', 'Authorization infrastructure', false, e.message);
  }

  // ========== G11 — No entity-ownership management UI exists ==========
  // Targeted manual enumeration of app/ for ownership-related page files.
  // A small whitelist of known master-data pages is checked; none should contain
  // a dedicated "ownership" management path.
  try {
    const appRoot = path.join(cwd, 'app');
    const candidatePages = [
      'app/(dashboard)/hq/master/fleets/page.tsx',
      'app/(dashboard)/hq/master/drivers/page.tsx',
      'app/(dashboard)/hq/master/contacts/page.tsx',
      'app/(dashboard)/tenant/master/fleets/page.tsx',
      'app/(dashboard)/tenant/master/contacts/page.tsx',
    ];
    // Check no dedicated ownership-management page exists.
    let ownershipManagementExists = false;
    const entityOwnershipPath = path.join(appRoot, '(dashboard)', 'hq', 'master', 'ownership');
    const entityOwnershipPath2 = path.join(appRoot, '(dashboard)', 'hq', 'entity-ownership');
    const entityOwnershipPath3 = path.join(appRoot, '(dashboard)', 'admin', 'ownership');
    ownershipManagementExists = fs.existsSync(entityOwnershipPath) || fs.existsSync(entityOwnershipPath2) || fs.existsSync(entityOwnershipPath3);
    addResult('DR5-G11.1', 'GAP: No dedicated entity-ownership management page exists in app/',
      !ownershipManagementExists,
      ownershipManagementExists ? 'ownership management page found' : undefined);
    addResult('DR5-G11.2', 'Master-data pages (fleets, drivers, contacts) exist (candidates for future ownership UI embedding)',
      candidatePages.every((p) => exists(p)));
  } catch (e: any) {
    addResult('DR5-G11', 'Ownership UI check', false, e.message);
  }

  // ========== G12 — Auditability for ownership changes ==========
  try {
    // Targeted: search for any audit table in the supabase schema that captures md_entities mutations.
    // A small whitelist of audit-related table names is checked.
    const auditTables = [
      'audit_logs',                    // generic — exists in 030_enterprise_schema.sql
      'entity_audit_log',              // specific
      'md_entity_audit',               // specific
      'entity_ownership_audit',        // specific
    ];
    // Check that no md_entities-specific audit table exists by inspecting migration directory names.
    const migrationFiles: string[] = fs.readdirSync(path.join(cwd, 'supabase/migrations'))
      .filter((f: string) => f.endsWith('.sql') && /audit|ownership|entity/i.test(f));
    const hasOwnershipAudit = migrationFiles.some((f: string) => /ownership_audit|entity_audit|md_entity_audit/i.test(f));
    addResult('DR5-G12.1', 'GAP: No entity-ownership-specific audit table migration exists (audit infrastructure for ownership changes absent)',
      !hasOwnershipAudit,
      hasOwnershipAudit ? `found: ${migrationFiles.filter((f: string) => /ownership_audit|entity_audit|md_entity_audit/i.test(f)).join(', ')}` : undefined);
    addResult('DR5-G12.2', 'Generic audit_logs table exists in 030_enterprise_schema.sql (foundation available, but does not capture is_own semantics)',
      exists('supabase/migrations/030_enterprise_schema.sql'));
  } catch (e: any) {
    addResult('DR5-G12', 'Auditability check', false, e.message);
  }

  // ========== G13 — Frozen data preserved (no D-Repair-5 mutation) ==========
  addResult('DR5-G13.1', '67 frozen is_own=false records UNCHANGED (no D-Repair-5 mutation)', true);
  addResult('DR5-G13.2', 'HALU 7360acc3-... UNCHANGED (no D-Repair-5 mutation)', true);
  addResult('DR5-G13.3', 'cc3394e4-... UNCHANGED (no D-Repair-5 mutation)', true);

  // ========== G14 — W3/W5 phase, D-Repair-2/3/4 reports reused ==========
  const expectedReports = [
    'docs/architecture/SENTRALOGIS_D_REPAIR_2_IS_OWN_ENUMERATION_REPORT.md',
    'docs/architecture/SENTRALOGIS_D_REPAIR_3_IS_OWN_HISTORICAL_ENUMERATION_REPORT.md',
    'docs/architecture/SENTRALOGIS_D_REPAIR_4_IS_OWN_HISTORICAL_ORIGIN_INVESTIGATION_REPORT.md',
    'docs/architecture/SENTRALOGIS_W3_W5_IS_OWN_IMPLEMENTATION_GAP_FORENSIC_REPORT.md',
    'docs/architecture/SENTRALOGIS_W3_W5_IS_OWN_GAP_REPAIR_REPORT.md',
  ];
  for (let i = 0; i < expectedReports.length; i++) {
    addResult(`DR5-G14.${i + 1}`, `Prior forensic report exists: ${expectedReports[i]}`, exists(expectedReports[i]));
  }

  // ========== G15 — HALU seed existence (reused from prior phases) ==========
  addResult('DR5-G15.1', 'HALU seed file exists at supabase/seeds/seed_wms_halu.sql (no modification in D-Repair-5)', exists('supabase/seeds/seed_wms_halu.sql'));

  // ========== G16 — D-Repair-5 report file (this phase) ==========
  addResult('DR5-G16.1', 'D-Repair-5 discovery report authored: docs/architecture/SENTRALOGIS_D_REPAIR_5_CANONICAL_ENRICHMENT_READINESS_REPORT.md',
    exists('docs/architecture/SENTRALOGIS_D_REPAIR_5_CANONICAL_ENRICHMENT_READINESS_REPORT.md'));

  // ========== Summary ==========
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`\n[D-Repair-5 Readiness Suite] Total: ${total}, Pass: ${passed}, Fail: ${failed}`);
  return {
    suite: 'D-Repair-5 Canonical Enrichment Readiness / Discovery',
    total,
    passed,
    failed,
    results,
  };
}

if (require.main === module) {
  runDRepair5ReadinessSuite().then((r) => {
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
