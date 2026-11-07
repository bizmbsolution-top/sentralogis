/**
 * Task 03 regression contracts — assignment concurrency and driver capability.
 *
 * These tests deliberately inspect the current implementation contract. They
 * are not PostgreSQL concurrency tests: a disposable database integration suite
 * is still required to prove row-lock behavior under competing transactions.
 *
 * The atomic assignment RPC name is the intended canonical contract for both
 * normal and batch assignment paths. Until the implementation is migrated to
 * that RPC, the corresponding tests are expected to fail and expose the gap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

function source(relativePath: string): string {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Task 03 source file is missing: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const assignmentService = source('lib/domain/jo/job-order-domain-service.ts');
const replacementMigration = source(
  'supabase/migrations/202611070002_task03_atomic_driver_replacement.sql',
);
const confirmationMigration = source(
  'supabase/migrations/202611070001_task03_canonical_driver_confirmation.sql',
);
const acceptRoute = source('app/api/jo/accept/route.ts');

describe('Task 03 regression contracts — atomic assignment', () => {
  it('normal driver assignment delegates to the canonical atomic assignment RPC', () => {
    const methodStart = assignmentService.indexOf('async assignDriver(');
    const methodEnd = assignmentService.indexOf('\n  async batchAssign(', methodStart);
    expect(methodStart).toBeGreaterThanOrEqual(0);
    expect(methodEnd).toBeGreaterThan(methodStart);

    const method = assignmentService.slice(methodStart, methodEnd);
    expect(method).toContain("rpc('assign_driver_atomic'");
    expect(method).not.toContain(".from('job_orders')\n        .update(updatePayload)");
  });

  it('batch assignment uses the same atomic resource reservation contract', () => {
    const methodStart = assignmentService.indexOf('async batchAssign(');
    const methodEnd = assignmentService.indexOf('\n  async ', methodStart + 1);
    expect(methodStart).toBeGreaterThanOrEqual(0);

    const method = assignmentService.slice(
      methodStart,
      methodEnd > methodStart ? methodEnd : undefined,
    );
    expect(method).toContain("rpc('assign_driver_atomic'");
  });

  it('replacement releases the previous driver only when no other active JO uses it', () => {
    const driverReleaseStart = replacementMigration.indexOf(
      'UPDATE public.md_drivers',
      replacementMigration.indexOf('-- Release only the previous resources'),
    );
    const driverReleaseEnd = replacementMigration.indexOf(
      'UPDATE public.md_fleets',
      driverReleaseStart,
    );
    expect(driverReleaseStart).toBeGreaterThanOrEqual(0);

    const driverRelease = replacementMigration.slice(
      driverReleaseStart,
      driverReleaseEnd > driverReleaseStart ? driverReleaseEnd : undefined,
    );
    expect(driverRelease).toMatch(/NOT\s+EXISTS\s*\(/i);
    expect(driverRelease).toContain('other_jo.driver_id = v_jo.driver_id');
    expect(driverRelease).toContain('other_jo.tenant_id = p_tenant_id');
  });

  it('replacement releases the previous fleet only when no other active JO uses it', () => {
    const fleetReleaseStart = replacementMigration.indexOf(
      'UPDATE public.md_fleets',
      replacementMigration.indexOf('-- Release only the previous resources'),
    );
    const driverReleaseStart = replacementMigration.indexOf(
      'UPDATE public.md_drivers',
      fleetReleaseStart,
    );
    expect(fleetReleaseStart).toBeGreaterThanOrEqual(0);

    const fleetRelease = replacementMigration.slice(
      fleetReleaseStart,
      driverReleaseStart > fleetReleaseStart ? driverReleaseStart : undefined,
    );
    expect(fleetRelease).toMatch(/NOT\s+EXISTS\s*\(/i);
    expect(fleetRelease).toContain('other_jo.fleet_id = v_jo.fleet_id');
    expect(fleetRelease).toContain('other_jo.tenant_id = p_tenant_id');
  });
});

describe('Task 03 regression contracts — driver-link capability', () => {
  it('confirmation RPC accepts and revalidates the exact driver link token after locking the JO', () => {
    expect(confirmationMigration).toMatch(
      /p_driver_link_token\s+TEXT/i,
    );

    const lockIndex = confirmationMigration.indexOf('FOR UPDATE');
    const tokenCheckIndex = confirmationMigration.indexOf(
      'driver_link_token',
      lockIndex,
    );
    expect(lockIndex).toBeGreaterThanOrEqual(0);
    expect(tokenCheckIndex).toBeGreaterThan(lockIndex);
    expect(confirmationMigration).toMatch(
      /driver_link_token\s+IS\s+DISTINCT\s+FROM\s+p_driver_link_token/i,
    );
  });

  it('direct accept endpoint passes the submitted token into the atomic confirmation RPC', () => {
    const rpcStart = acceptRoute.indexOf(".rpc(\n      'vendor_job_confirmation'");
    expect(rpcStart).toBeGreaterThanOrEqual(0);
    const rpcEnd = acceptRoute.indexOf('\n    );', rpcStart);
    expect(rpcEnd).toBeGreaterThan(rpcStart);

    const rpcCall = acceptRoute.slice(rpcStart, rpcEnd);
    expect(rpcCall).toContain('p_driver_link_token: token');
  });
});
