/**
 * Task 03 regression test foundation.
 *
 * Adapts the existing ADR-091 domain mutation suite and ADR-092
 * ASSIGN_DRIVER integration suite to Vitest so they run in the normal
 * test pipeline. These suites use an in-memory mock database; they do
 * NOT replace PostgreSQL integration tests for Task 03 RPC migrations.
 */
import { describe, expect, it } from 'vitest';

import { runAdr091Suite } from './adr091-copilot-domain-mutation-authority.test';
import { runAdr092Phase3Suite } from './adr092-phase3-assign-driver-e2e.test';

describe.sequential('Task 03 regression foundation — existing JO suites', () => {
  it('ADR-091 domain mutation suite passes all cases', async () => {
    const result = await runAdr091Suite();

    expect(result.total).toBe(16);
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(result.total);
  });

  it('ADR-092 ASSIGN_DRIVER integration suite passes all cases', async () => {
    const result = await runAdr092Phase3Suite();

    expect(result.total).toBe(10);
    expect(result.failed).toBe(0);
    expect(result.passed).toBe(result.total);
  });
});
