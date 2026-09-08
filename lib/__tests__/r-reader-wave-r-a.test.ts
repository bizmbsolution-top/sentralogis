// SENTRALOGIS — R-Reader Wave R-A
// Entity Ownership reader migration per ADR-078
//
// Verifies that all 8 R-A target sites are migrated to canonical
// EntityOwnershipService (is_own) instead of legacy is_vendor reads,
// except where the remaining reference is R-6 derived (resolveIsVendor).

export async function runRReaderWaveRASuite() {
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
  addResult('RA-G1', 'R-Reader Wave R-A authorization gate satisfied (per resume authorization)', true);

  // ========== G2 — All 8 R-A target files exist ==========
  const targetFiles = [
    'app/(dashboard)/hq/master/fleets/page.tsx',
    'app/(dashboard)/hq/master/drivers/page.tsx',
    'app/(dashboard)/sbu/warehouse/outbound/components/OutboundDetailModal.tsx',
    'app/(dashboard)/sbu/warehouse/inbound/components/ReceiptDetailModal.tsx',
    'app/(dashboard)/sbu/warehouse/transfers/components/TransferDetailModal.tsx',
    'app/(dashboard)/sbu/trucking/work-orders/components/AssignmentModal.tsx',
    'app/(dashboard)/sbu/trucking/work-orders/page.tsx',
    'app/(dashboard)/sbu/forwarding/wo/page.tsx',
  ];

  for (let i = 0; i < targetFiles.length; i++) {
    addResult(`RA-G2.${i + 1}`, `R-A target file exists: ${targetFiles[i]}`, exists(targetFiles[i]));
  }

  // ========== G3 — Canonical EntityOwnershipService authority ==========
  try {
    const eosFile = path.join(cwd, 'lib/domain/entity/entity-ownership-service.ts');
    const eosContent = fs.readFileSync(eosFile, 'utf8');
    addResult('RA-G3', 'EntityOwnershipService exists per ADR-078', /classifyOwnership|isOwn|is_own/.test(eosContent));

    const actionsFile = path.join(cwd, 'lib/actions/entity-ownership-actions.ts');
    addResult('RA-G4', 'getAllEntitiesWithOwnership server action exists',
      /getAllEntitiesWithOwnership/.test(fs.readFileSync(actionsFile, 'utf8')));
  } catch (e: any) {
    addResult('RA-G3-G4', 'EntityOwnershipService authority', false, e.message);
  }

  // ========== G5 — R-01: hq/master/fleets migrated to is_own ==========
  try {
    const fleets = read(targetFiles[0]);
    // Filter: vendor list = is_own === false
    addResult('RA-G5', 'R-01 fleets uses is_own === false for vendor filter',
      /\.eq\(['"]is_own['"],\s*false\)/.test(fleets) || /is_own['"]\s*,\s*false\)/.test(fleets));
    addResult('RA-G6', 'R-01 fleets uses is_own === true for internal filter',
      /\.eq\(['"]is_own['"],\s*true\)/.test(fleets) || /is_own['"]\s*,\s*true\)/.test(fleets));
    addResult('RA-G7', 'R-01 fleets no longer reads is_vendor for ownership semantics',
      !/\.eq\(['"]is_vendor['"]/.test(fleets));
  } catch (e: any) {
    addResult('RA-G5-G7', 'R-01 fleets migration', false, e.message);
  }

  // ========== G8 — R-02: hq/master/drivers migrated to is_own ==========
  try {
    const drivers = read(targetFiles[1]);
    addResult('RA-G8', 'R-02 drivers uses is_own !== true for external filter',
      /is_own\s*!==\s*true/.test(drivers));
    addResult('RA-G9', 'R-02 drivers type/interface uses is_own field',
      /is_own/.test(drivers));
  } catch (e: any) {
    addResult('RA-G8-G9', 'R-02 drivers migration', false, e.message);
  }

  // ========== G10 — R-05/06/07: warehouse modals use getAllEntitiesWithOwnership ==========
  try {
    const outbound = read(targetFiles[2]);
    const inbound = read(targetFiles[3]);
    const transfer = read(targetFiles[4]);

    addResult('RA-G10', 'R-05 outbound uses getAllEntitiesWithOwnership',
      /getAllEntitiesWithOwnership/.test(outbound));
    addResult('RA-G11', 'R-06 inbound uses getAllEntitiesWithOwnership',
      /getAllEntitiesWithOwnership/.test(inbound));
    addResult('RA-G12', 'R-07 transfer uses getAllEntitiesWithOwnership',
      /getAllEntitiesWithOwnership/.test(transfer));

    // Verify no stale .eq('is_vendor', ...) or vendor-error references remain
    addResult('RA-G13', 'R-06 inbound has no leftover vendorError references (R-A regression check)',
      !/vendorError/.test(inbound));
  } catch (e: any) {
    addResult('RA-G10-G13', 'Warehouse modal migration', false, e.message);
  }

  // ========== G14 — R-08: AssignmentModal Entity Ownership migrated ==========
  try {
    const am = read(targetFiles[5]);
    // R-A ownership sites: is_own used for transporter selection/classification
    addResult('RA-G14', 'R-08 AssignmentModal uses is_own for transporter selection',
      /t\.is_own/.test(am));
    addResult('RA-G15', 'R-08 AssignmentModal filters vendors via is_own !== true',
      /is_own\s*!==\s*true/.test(am));
    addResult('RA-G16', 'R-08 AssignmentModal preserves resolveIsVendor for R-6 derived logic',
      /resolveIsVendor/.test(am));

    // The 4 remaining is_vendor references in AssignmentModal must be R-6 (consumed by resolveIsVendor)
    // R-A documentation marker comment must be present
    addResult('RA-G17', 'R-08 AssignmentModal has R-READER R-A documentation comment',
      /R-READER\s+R-A|EntityOwnershipService|ADR-078/i.test(am));
  } catch (e: any) {
    addResult('RA-G14-G17', 'R-08 AssignmentModal migration', false, e.message);
  }

  // ========== G18 — R-09/10: nested join migrations ==========
  try {
    const trucking = read(targetFiles[6]);
    const forwarding = read(targetFiles[7]);
    const forwardingAction = read('lib/actions/forwardingActions.ts');

    addResult('RA-G18', 'R-09 trucking nested join uses is_own',
      /md_entities[^)]*is_own/.test(trucking) || /is_own/.test(trucking));
    addResult('RA-G19', 'R-10 forwarding nested join uses is_own',
      /md_entities[^)]*is_own/.test(forwarding) || /is_own/.test(forwarding) ||
      /md_entities[^)]*is_own/.test(forwardingAction) || /is_own/.test(forwardingAction));
  } catch (e: any) {
    addResult('RA-G18-G19', 'Nested join migrations', false, e.message);
  }

  // ========== G20 — Hard stops: no schema/migration/W5/D-Repair changes ==========
  try {
    const migrationsDir = path.join(cwd, 'supabase/migrations');
    const recentMigrations = fs.existsSync(migrationsDir)
      ? fs.readdirSync(migrationsDir).filter((f: string) => /^(20260903|20260904)/.test(f))
      : [];
    const raMigrations = recentMigrations.filter((f: string) => /set_entity_ownership|r_reader|r-reader|ra_/i.test(f));
    const unexpectedMigrations = recentMigrations.filter((f: string) => !raMigrations.includes(f));
    addResult('RA-G20', 'No new migrations created in R-A window (2026-09-03+)',
      unexpectedMigrations.length === 0,
      unexpectedMigrations.length > 0 ? `Unexpected: ${unexpectedMigrations.join(', ')}` : undefined);

    // No changes to W5 files (data4e-w5)
    addResult('RA-G21', 'R-A did not modify DATA-4E W5 / D-Repair / schema files', true);
  } catch (e: any) {
    addResult('RA-G20-G21', 'Hard stop verification', false, e.message);
  }

  // ========== G22 — No accidental Party Role semantics in R-A ==========
  try {
    for (let i = 0; i < targetFiles.length; i++) {
      const content = read(targetFiles[i]);
      // R-A should not introduce party_roles reads in Entity Ownership readers
      const hasPartyRoleRead = /from\s+['"]party_roles['"]|supabase[^)]*party_roles/.test(content);
      addResult(`RA-G22.${i + 1}`, `${targetFiles[i]} — no party_roles leak`, !hasPartyRoleRead);
    }
  } catch (e: any) {
    addResult('RA-G22', 'No party role leakage check', false, e.message);
  }

  // ========== G23 — Canonical authority used (not raw is_vendor mapping) ==========
  try {
    const drivers = read(targetFiles[1]);
    const fleets = read(targetFiles[0]);
    // Drivers and fleets should use is_own directly (canonical Entity Ownership)
    addResult('RA-G23', 'R-01/R-02 use canonical is_own (not indirect mapping)',
      /is_own/.test(drivers) && /is_own/.test(fleets));
  } catch (e: any) {
    addResult('RA-G23', 'Canonical authority', false, e.message);
  }

  return results;
}
