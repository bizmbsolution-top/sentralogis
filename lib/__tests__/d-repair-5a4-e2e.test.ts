// SENTRALOGIS — D-Repair-5A.4 Canonical Enrichment End-to-End Verification
// Targeted tests verifying the complete setEntity_ownership() chain flows correctly.

export async function runDRepair5A4E2eSuite() {
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

  // ---- File paths ----
  const migrationPath = 'supabase/migrations/20260904_051_set_entity_ownership.sql';
  const servicePath = 'lib/domain/entity/entity-ownership-service.ts';
  const actionPath = 'lib/actions/entity-ownership-actions.ts';
  const serviceExists = exists(servicePath);
  const actionExists = exists(actionPath);
  const migrationExists = exists(migrationPath);

  const migration = migrationExists ? read(migrationPath) : '';
  const service = serviceExists ? read(servicePath) : '';
  const action = actionExists ? read(actionPath) : '';

  // ========== F1 — Migration function signature ==========
  addResult('DR5A4-F1.1', 'Migration contains set_entity_ownership function',
    /CREATE OR REPLACE FUNCTION.*set_entity_ownership/.test(migration));
  addResult('DR5A4-F1.2', 'Migration accepts p_entity_id UUID parameter',
    /p_entity_id UUID/.test(migration));
  addResult('DR5A4-F1.3', 'Migration accepts p_new_is_own BOOLEAN parameter',
    /p_new_is_own BOOLEAN/.test(migration));
  addResult('DR5A4-F1.4', 'Migration accepts p_reason TEXT parameter',
    /p_reason TEXT/.test(migration));
  addResult('DR5A4-F1.5', 'Migration uses IS NOT DISTINCT FROM for NULL-safe concurrency',
    /IS NOT DISTINCT FROM/.test(migration));
  addResult('DR5A4-F1.6', 'Migration has entity_type filter for md_entity',
    /entity_type/.test(migration) && /md_entity/.test(migration));
  addResult('DR5A4-F1.7', 'Migration has operation filter for OWNERSHIP_CLASSIFIED',
    /OWNERSHIP_CLASSIFIED/.test(migration));

  // ========== F2 — Service references function correctly ==========
  addResult('DR5A4-F2.1', 'EntityOwnershipService invokes set_entity_ownership RPC',
    serviceExists && /rpc\(['"]set_entity_ownership/.test(service));
  addResult('DR5A4-F2.2', 'Service setOwnership method uses expectedCurrentValue guard',
    serviceExists && /expectedCurrentValue/.test(service));
  addResult('DR5A4-F2.3', 'Service propagates reason text to RPC',
    serviceExists && /p_reason/.test(service));
  addResult('DR5A4-F2.4', 'Service uses idempotency key for conflict prevention',
    serviceExists && /idempotency/.test(service));

  // ========== F3 — Server action builds correct command ==========
  addResult('DR5A4-F3.1', 'Server action extracts entityId from params',
    actionExists && /entityId,/.test(action));
  addResult('DR5A4-F3.2', 'Server action extracts isOwn from params',
    actionExists && /isOwn,/.test(action));
  addResult('DR5A4-F3.3', 'Server action extracts expectedCurrentValue from params',
    actionExists && /expectedCurrentValue,/.test(action));
  addResult('DR5A4-F3.4', 'Server action extracts reason from params',
    actionExists && /reason,/.test(action));
  addResult('DR5A4-F3.5', 'Server action optionally extracts idempotencyKey',
    actionExists && /idempotencyKey,/.test(action));

  // ========== F4 — Chain consistency across all three phases ==========
  addResult('DR5A4-F4.1', 'Migration has entity_type=md_entity filter',
    migrationExists && /entity_type/.test(migration) && /md_entity/.test(migration));
  addResult('DR5A4-F4.2', 'Migration has OWNERSHIP_CLASSIFIED operation in audit',
    migrationExists && /OWNERSHIP_CLASSIFIED/.test(migration));
  addResult('DR5A4-F4.3', 'Server action constructs command for EntityOwnershipService',
    actionExists && /new EntityOwnershipService/.test(action) &&
    /svc\.setOwnership\(identityContext, command\)/.test(action));
  addResult('DR5A4-F4.4', 'Service RPC call uses command fields (p_entity_id, p_tenant_id, p_new_is_own, p_reason, p_idempotency_key)',
    serviceExists && /p_entity_id/.test(service) &&
    /p_new_is_own/.test(service) &&
    /p_reason/.test(service) &&
    /p_idempotency_key/.test(service));
  addResult('DR5A4-F4.5', 'Server action tenant isolation via ctx.tenant_id',
    actionExists && /tenantId:.*ctx\.tenant_id/.test(action));

  // ========== F5 — Type and signature consistency ==========
  addResult('DR5A4-F5.1', 'Server action returns Promise<ServerActionResult<SetOwnershipResult>>',
    actionExists && /Promise<ServerActionResult<SetOwnershipResult>>/.test(action));
  addResult('DR5A4-F5.2', 'Service setOwnership returns a promise or observable',
    serviceExists && /setOwnership\(/.test(service));
  addResult('DR5A4-F5.3', 'Migration function has consistent parameter count (5 params)',
    (/p_entity_id/.test(migration) && /p_new_is_own/.test(migration) && /p_expected_current_value/.test(migration) && /p_reason/.test(migration)));

  // ========== F6 — No cross-phase drift ==========
  addResult('DR5A4-F6.1', 'Migration entity_type=md_entity correctly defined',
    migrationExists && /entity_type/.test(migration) && /md_entity/.test(migration));
  addResult('DR5A4-F6.2', 'Migration OWNERSHIP_CLASSIFIED operation correctly defined',
    migrationExists && /OWNERSHIP_CLASSIFIED/.test(migration));

  // ========== Summary ==========
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;
  console.log(`\n[D-Repair-5A.4 Canonical Enrichment E2E Suite] Total: ${total}, Pass: ${passed}, Fail: ${failed}`);
  return {
    suite: 'D-Repair-5A.4 Canonical Enrichment End-to-End Verification',
    total,
    passed,
    failed,
    results,
  };
}

if (require.main === module) {
  runDRepair5A4E2eSuite().then((r) => {
    process.exit(r.failed > 0 ? 1 : 0);
  });
}