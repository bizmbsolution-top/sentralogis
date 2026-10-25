/**
 * Sentralogis — ERP Accounting Dispatch Test Suite
 * lib/__tests__/erp-accounting-dispatch.test.ts
 *
 * Validates the ratified ERP Provider / Accounting Dispatch contracts (D1–D7, ADR-064 / ADR-069):
 * 1. adapter contract
 * 2. acknowledged response
 * 3. rejected response
 * 4. transient failure
 * 5. ambiguous response
 * 6. VALIDATED -> DISPATCHED
 * 7. DISPATCHED -> ACKNOWLEDGED
 * 8. DISPATCHED -> REJECTED
 * 9. DISPATCHED -> FAILED
 * 10. ambiguous outcome does not become ACKNOWLEDGED
 * 11. 2xx does not automatically imply ACKNOWLEDGED
 * 12. deterministic idempotency
 * 13. duplicate dispatch protection
 * 14. tenant isolation
 * 15. permission enforcement
 * 16. bounded batch processing
 * 17. external correlation handling
 * 18. failure_reason handling
 * 19. no real network access
 * 20. no real ERP credentials
 * 21. legacy finance isolation
 * 22. AR/AP isolation
 */

// Self-contained assertion helpers (zero external import dependencies)
function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}
assert.equal = function (actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
  }
};
assert.notEqual = function (actual: any, expected: any, message?: string) {
  if (actual === expected) {
    throw new Error(message || `Expected ${JSON.stringify(actual)} NOT to equal ${JSON.stringify(expected)}`);
  }
};
assert.ok = function (val: any, message?: string) {
  if (!val) {
    throw new Error(message || `Expected truthy value, got ${val}`);
  }
};
assert.match = function (str: string, regex: RegExp, message?: string) {
  if (!regex.test(str)) {
    throw new Error(message || `Expected "${str}" to match ${regex}`);
  }
};
assert.rejects = async function (fn: () => Promise<any>, errorValidator?: (err: any) => boolean) {
  let threw = false;
  try {
    await fn();
  } catch (err: any) {
    threw = true;
    if (errorValidator) {
      errorValidator(err);
    }
  }
  if (!threw) {
    throw new Error('Expected function to reject, but it resolved successfully');
  }
};

import type { IdentityContext } from '../application/identity/types';
import {
  MockErpProviderAdapter,
  interpretProviderHttpResponse,
} from '../accounting/adapter';
import { OutboxDispatcher } from '../accounting/dispatcher';
import { AccountingService } from '../accounting/service';
import {
  _setAccountingDbClient,
  getPendingValidatedEvents,
  markEventDispatched,
  markEventAcknowledged,
  markEventRejected,
  markEventFailed,
  markEventAmbiguous,
} from '../accounting/repository';
import type {
  AccountingEvent,
  AccountingEventLine,
  DispatchResult,
  ErpProviderAdapter,
} from '../accounting/types';
import { AccountingError } from '../accounting/types';

// ============================================================================
// IN-MEMORY MOCK DATABASE CLIENT (Complete Isolation)
// ============================================================================

interface MockTableState {
  accounting_events: any[];
  accounting_event_lines: any[];
  fin_ar_ap: any[];
  finance_journals: any[];
  finance_journal_entries: any[];
  invoices: any[];
}

function createMockDb(initialState?: Partial<MockTableState>) {
  const state: MockTableState = {
    accounting_events: initialState?.accounting_events ?? [],
    accounting_event_lines: initialState?.accounting_event_lines ?? [],
    fin_ar_ap: initialState?.fin_ar_ap ?? [],
    finance_journals: initialState?.finance_journals ?? [],
    finance_journal_entries: initialState?.finance_journal_entries ?? [],
    invoices: initialState?.invoices ?? [],
  };

  const client = {
    state,
    from(tableName: keyof MockTableState) {
      const table = state[tableName] || [];
      return {
        select(cols?: string) {
          let filtered = [...table];
          let limitCount: number | null = null;

          const queryChain: any = {
            eq(col: string, val: any) {
              filtered = filtered.filter((row) => row[col] === val);
              return queryChain;
            },
            order(col: string, opts?: { ascending?: boolean }) {
              const asc = opts?.ascending !== false;
              filtered.sort((a, b) => {
                if (a[col] < b[col]) return asc ? -1 : 1;
                if (a[col] > b[col]) return asc ? 1 : -1;
                return 0;
              });
              return queryChain;
            },
            limit(count: number) {
              limitCount = count;
              return queryChain;
            },
            maybeSingle() {
              return Promise.resolve({
                data: filtered.length > 0 ? { ...filtered[0] } : null,
                error: null,
              });
            },
            single() {
              if (filtered.length === 0) {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Row not found', code: 'PGRST116' },
                });
              }
              return Promise.resolve({
                data: { ...filtered[0] },
                error: null,
              });
            },
            then(resolve: any) {
              const res = limitCount !== null ? filtered.slice(0, limitCount) : filtered;
              return Promise.resolve({
                data: res.map((r) => ({ ...r })),
                error: null,
              }).then(resolve);
            },
          };
          return queryChain;
        },

        insert(rowOrRows: any) {
          const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          for (const row of rows) {
            table.push({ ...row });
          }
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: { ...rows[0] },
                    error: null,
                  });
                },
              };
            },
          };
        },

        update(updates: any) {
          let targetRows = [...table];
          const updateChain: any = {
            eq(col: string, val: any) {
              targetRows = targetRows.filter((r) => r[col] === val);
              return updateChain;
            },
            select() {
              return {
                single() {
                  if (targetRows.length === 0) {
                    return Promise.resolve({
                      data: null,
                      error: { message: 'Row not found for update', code: 'PGRST116' },
                    });
                  }
                  // Mutate matching rows in state
                  const target = targetRows[0];
                  Object.assign(target, updates);
                  return Promise.resolve({
                    data: { ...target },
                    error: null,
                  });
                },
              };
            },
          };
          return updateChain;
        },
      };
    },
  };

  return client;
}

// ============================================================================
// FIXTURES
// ============================================================================

const TENANT_A = '11111111-1111-4000-8000-111111111111';
const TENANT_B = '22222222-2222-4000-8000-222222222222';
const USER_A = 'aaaaaaaa-aaaa-4000-8000-aaaaaaaaaaaa';

function makeCtx(overrides?: Partial<IdentityContext>): IdentityContext {
  return {
    userId: USER_A,
    tenantId: TENANT_A,
    membershipId: 'mem-1',
    role: 'HQ_FINANCE_DIRECTOR',
    isTenantOwner: false,
    permissions: ['commercial:read', 'commercial:manage'],
    sbuScope: null,
    ...overrides,
  };
}

function makeEvent(overrides?: Partial<any>): any {
  const base = {
    id: 'evt-1001',
    tenant_id: TENANT_A,
    tenantId: TENANT_A,
    event_type: 'SETTLEMENT_COMPLETED',
    eventType: 'SETTLEMENT_COMPLETED',
    source_entity_type: 'fin_settlements',
    sourceEntityType: 'fin_settlements',
    source_entity_id: 'set-1001',
    sourceEntityId: 'set-1001',
    source_reference: 'SET-2026-001',
    sourceReference: 'SET-2026-001',
    accounting_date: '2026-10-05',
    accountingDate: '2026-10-05',
    currency: 'IDR',
    fx_rate: null,
    fxRate: null,
    fx_currency: null,
    fxCurrency: null,
    fx_timestamp: null,
    fxTimestamp: null,
    total_debit: 1500000,
    totalDebit: 1500000,
    total_credit: 1500000,
    totalCredit: 1500000,
    status: 'VALIDATED',
    idempotency_key: 'fin_settlements:set-1001:SETTLEMENT_COMPLETED',
    idempotencyKey: 'fin_settlements:set-1001:SETTLEMENT_COMPLETED',
    external_correlation_id: null,
    externalCorrelationId: null,
    external_system: null,
    externalSystem: null,
    acknowledged_at: null,
    acknowledgedAt: null,
    failure_reason: null,
    failureReason: null,
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    created_by: USER_A,
    createdBy: USER_A,
    updated_by: USER_A,
    updatedBy: USER_A,
    ...overrides,
  };
  if (overrides?.tenantId) base.tenant_id = overrides.tenantId;
  if (overrides?.tenant_id) base.tenantId = overrides.tenant_id;
  return base;
}

function makeLines(eventId: string): any[] {
  return [
    {
      id: 'line-1',
      tenant_id: TENANT_A,
      tenantId: TENANT_A,
      accounting_event_id: eventId,
      accountingEventId: eventId,
      line_type: 'DEBIT',
      lineType: 'DEBIT',
      account_code: '1-11010',
      accountCode: '1-11010',
      description: 'Kas Bank',
      amount: 1500000,
      currency: 'IDR',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_by: USER_A,
      createdBy: USER_A,
      updated_by: USER_A,
      updatedBy: USER_A,
    },
    {
      id: 'line-2',
      tenant_id: TENANT_A,
      tenantId: TENANT_A,
      accounting_event_id: eventId,
      accountingEventId: eventId,
      line_type: 'CREDIT',
      lineType: 'CREDIT',
      account_code: '1-10100',
      accountCode: '1-10100',
      description: 'Piutang Usaha',
      amount: 1500000,
      currency: 'IDR',
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      created_by: USER_A,
      createdBy: USER_A,
      updated_by: USER_A,
      updatedBy: USER_A,
    },
  ];
}


// ============================================================================
// TEST SUITE
// ============================================================================

export async function runErpAccountingDispatchSuite() {
  console.log('--- Starting ERP Accounting Dispatch Test Suite ---');

  // Test 1: Adapter contract shape
  {
    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_TEST');
    assert.equal(adapter.providerCode, 'MOCK_TEST');
    assert.equal(typeof adapter.dispatch, 'function');
    assert.equal(typeof adapter.reconcile, 'function');
    console.log('✓ 1. Adapter contract adheres to ErpProviderAdapter interface');
  }

  // Test 2: Acknowledged response updates DB state
  {
    const evt = makeEvent({ id: 'evt-ack-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP', 'VCH-999');
    const ctx = makeCtx();
    const service = new AccountingService(ctx);

    const summary = await service.dispatchPendingEvents(adapter);

    assert.equal(summary.totalProcessed, 1);
    assert.equal(summary.acknowledgedCount, 1);
    const updated = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(updated.status, 'ACKNOWLEDGED');
    assert.ok(updated.acknowledged_at);
    assert.equal(updated.external_correlation_id, 'EXT-EVT-ACK-');
    assert.equal(updated.failure_reason, null);
    console.log('✓ 2. Acknowledged response updates status to ACKNOWLEDGED with correlation and timestamp');
  }

  // Test 3: Rejected response updates DB state
  {
    const evt = makeEvent({ id: 'evt-rej-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createRejected('Invalid COA mapping', 'MOCK_ERP');
    const ctx = makeCtx();
    const service = new AccountingService(ctx);

    const summary = await service.dispatchPendingEvents(adapter);

    assert.equal(summary.totalProcessed, 1);
    assert.equal(summary.rejectedCount, 1);
    const updated = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(updated.status, 'REJECTED');
    assert.equal(updated.failure_reason, 'Invalid COA mapping');
    assert.equal(updated.acknowledged_at, null);
    console.log('✓ 3. Rejected response updates status to REJECTED with failure_reason');
  }

  // Test 4: Transient failure updates DB state
  {
    const evt = makeEvent({ id: 'evt-fail-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createTransientFailure('HTTP 503 Service Unavailable', 'MOCK_ERP');
    const ctx = makeCtx();
    const service = new AccountingService(ctx);

    const summary = await service.dispatchPendingEvents(adapter);

    assert.equal(summary.totalProcessed, 1);
    assert.equal(summary.transientFailureCount, 1);
    const updated = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(updated.status, 'FAILED');
    assert.equal(updated.failure_reason, 'HTTP 503 Service Unavailable');
    console.log('✓ 4. Transient failure updates status to FAILED with failure_reason');
  }

  // Test 5: Ambiguous response keeps DB status as DISPATCHED
  {
    const evt = makeEvent({ id: 'evt-amb-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAmbiguous('Request timeout: state unknown', 'MOCK_ERP');
    const ctx = makeCtx();
    const service = new AccountingService(ctx);

    const summary = await service.dispatchPendingEvents(adapter);

    assert.equal(summary.totalProcessed, 1);
    assert.equal(summary.ambiguousCount, 1);
    const updated = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    // Invariant: database status remains DISPATCHED (last confirmed state)
    assert.equal(updated.status, 'DISPATCHED');
    assert.match(updated.failure_reason, /AMBIGUOUS/);
    console.log('✓ 5. Ambiguous response preserves DISPATCHED status and records operational ambiguity');
  }

  // Test 6: VALIDATED -> DISPATCHED transition happens first
  {
    const evt = makeEvent({ id: 'evt-seq-1', status: 'VALIDATED' });
    let observedStatusDuringDispatch: string | null = null;

    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = new MockErpProviderAdapter('MOCK_ERP', async (event) => {
      // Inspect event row in database while adapter is being invoked
      const rowInDb = mockDb.state.accounting_events.find((e) => e.id === event.id);
      observedStatusDuringDispatch = rowInDb.status;
      return {
        category: 'ACKNOWLEDGED',
        voucherNumber: 'V-001',
        isRetryable: false,
      };
    });

    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchPendingEvents(adapter);

    assert.equal(observedStatusDuringDispatch, 'DISPATCHED');
    console.log('✓ 6. Event transitions from VALIDATED to DISPATCHED before invoking adapter');
  }

  // Test 7: DISPATCHED -> ACKNOWLEDGED on success
  {
    const evt = makeEvent({ id: 'evt-flow-ack' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(row.status, 'ACKNOWLEDGED');
    console.log('✓ 7. DISPATCHED transitions to ACKNOWLEDGED upon verified provider success');
  }

  // Test 8: DISPATCHED -> REJECTED on business failure
  {
    const evt = makeEvent({ id: 'evt-flow-rej' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createRejected('Fiscal period closed', 'MOCK_ERP');
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(row.status, 'REJECTED');
    assert.equal(row.failure_reason, 'Fiscal period closed');
    console.log('✓ 8. DISPATCHED transitions to REJECTED on provider business rejection');
  }

  // Test 9: DISPATCHED -> FAILED on transient error
  {
    const evt = makeEvent({ id: 'evt-flow-fail' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createTransientFailure('Gateway timeout', 'MOCK_ERP');
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(row.status, 'FAILED');
    assert.equal(row.failure_reason, 'Gateway timeout');
    console.log('✓ 9. DISPATCHED transitions to FAILED on transient provider error');
  }

  // Test 10: Ambiguous outcome NEVER becomes ACKNOWLEDGED
  {
    const evt = makeEvent({ id: 'evt-flow-amb' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAmbiguous('Contradictory state response', 'MOCK_ERP');
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.notEqual(row.status, 'ACKNOWLEDGED');
    assert.equal(row.status, 'DISPATCHED');
    console.log('✓ 10. Ambiguous outcome is strictly prohibited from becoming ACKNOWLEDGED');
  }

  // Test 11: 2xx Semantic Rule Enforcement
  {
    // 11a: HTTP 202 is queued -> AMBIGUOUS, NOT ACKNOWLEDGED
    const res202 = interpretProviderHttpResponse(202, { jobId: 'job-123' });
    assert.equal(res202.category, 'AMBIGUOUS');
    assert.notEqual(res202.category, 'ACKNOWLEDGED');

    // 11b: HTTP 204 is undocumented -> AMBIGUOUS, NOT ACKNOWLEDGED
    const res204 = interpretProviderHttpResponse(204, null);
    assert.equal(res204.category, 'AMBIGUOUS');

    // 11c: HTTP 201 without genuine voucher -> AMBIGUOUS
    const res201NoVoucher = interpretProviderHttpResponse(201, { submissionId: 'sub-abc' });
    assert.equal(res201NoVoucher.category, 'AMBIGUOUS');

    // 11d: HTTP 201 with genuine voucher -> ACKNOWLEDGED
    const res201WithVoucher = interpretProviderHttpResponse(201, { voucherNumber: 'V-2026-001' });
    assert.equal(res201WithVoucher.category, 'ACKNOWLEDGED');

    // 11e: HTTP 200 without posted status -> AMBIGUOUS
    const res200Pending = interpretProviderHttpResponse(200, { status: 'PENDING' });
    assert.equal(res200Pending.category, 'AMBIGUOUS');

    // 11f: HTTP 200 with posted status and voucher -> ACKNOWLEDGED
    const res200Posted = interpretProviderHttpResponse(200, { posted: true, voucherNumber: 'V-200' });
    assert.equal(res200Posted.category, 'ACKNOWLEDGED');

    console.log('✓ 11. 2xx Semantic Rule: HTTP 202/204/generic-201 correctly interpreted as AMBIGUOUS');
  }

  // Test 12: Deterministic idempotency key
  {
    const evt = makeEvent({ id: 'evt-idemp-1' });
    const key1 = OutboxDispatcher.generateProviderKey(evt, 'ACCURATE');
    const key2 = OutboxDispatcher.generateProviderKey(evt, 'ACCURATE');
    const keyOther = OutboxDispatcher.generateProviderKey(evt, 'JURNAL');

    assert.equal(key1, 'evt-idemp-1:ACCURATE');
    assert.equal(key1, key2);
    assert.notEqual(key1, keyOther);
    console.log('✓ 12. Provider idempotency key is deterministic across calls');
  }

  // Test 13: Duplicate dispatch protection (only VALIDATED events can be dispatched)
  {
    const evt = makeEvent({ id: 'evt-dup-1', status: 'ACKNOWLEDGED' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    const ctx = makeCtx();

    await assert.rejects(
      async () => {
        await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);
      },
      (err: any) => {
        assert.ok(err instanceof AccountingError);
        assert.equal(err.code, 'INVALID_TRANSITION');
        return true;
      }
    );
    console.log('✓ 13. Duplicate dispatch protection: non-VALIDATED event rejected with INVALID_TRANSITION');
  }

  // Test 14: Tenant isolation
  {
    const evtTenantB = makeEvent({ id: 'evt-tb-1', tenantId: TENANT_B, status: 'VALIDATED' });
    const mockDb = createMockDb({
      accounting_events: [evtTenantB],
      accounting_event_lines: makeLines(evtTenantB.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    const ctxTenantA = makeCtx({ tenantId: TENANT_A });

    // Pending events query must not see Tenant B
    const pendingA = await getPendingValidatedEvents(ctxTenantA);
    assert.equal(pendingA.length, 0);

    // Single event dispatch across tenants must be rejected
    await assert.rejects(
      async () => {
        await new AccountingService(ctxTenantA).dispatchSingleEvent(evtTenantB.id, adapter);
      },
      (err: any) => {
        assert.ok(err instanceof AccountingError);
        assert.ok(
          err.code === 'ACCOUNTING_EVENT_NOT_FOUND' || err.code === 'ACCOUNTING_EVENT_NOT_OWNED',
          `Expected NOT_FOUND or NOT_OWNED, got: ${err.code}`
        );
        return true;
      }
    );
    console.log('✓ 14. Strict tenant isolation: Tenant A cannot see or dispatch Tenant B events');
  }

  // Test 15: Permission enforcement (commercial:manage required)
  {
    const ctxReadOnly = makeCtx({ permissions: ['commercial:read'] });
    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    const service = new AccountingService(ctxReadOnly);

    await assert.rejects(async () => {
      await service.dispatchPendingEvents(adapter);
    });

    console.log('✓ 15. Permission enforcement: identity without commercial:manage is rejected');
  }

  // Test 16: Bounded batch processing
  {
    const events = [
      makeEvent({ id: 'evt-b-1', status: 'VALIDATED' }),
      makeEvent({ id: 'evt-b-2', status: 'VALIDATED' }),
      makeEvent({ id: 'evt-b-3', status: 'VALIDATED' }),
    ];
    const mockDb = createMockDb({
      accounting_events: events,
      accounting_event_lines: [],
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    const ctx = makeCtx();
    const service = new AccountingService(ctx);

    const summary = await service.dispatchPendingEvents(adapter, { limit: 2 });
    assert.equal(summary.totalProcessed, 2);
    console.log('✓ 16. Bounded batch processing: respects limit parameter');
  }

  // Test 17: External correlation handling
  {
    const evt = makeEvent({ id: 'evt-corr-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = new MockErpProviderAdapter('MOCK_ERP', () => ({
      category: 'ACKNOWLEDGED',
      externalCorrelationId: 'ERP-CORR-777',
      voucherNumber: 'VOUCHER-777',
      isRetryable: false,
    }));
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(row.external_correlation_id, 'ERP-CORR-777');
    console.log('✓ 17. External correlation ID accurately recorded on accounting_events');
  }

  // Test 18: Failure reason handling
  {
    const evt = makeEvent({ id: 'evt-fail-reason-1' });
    const mockDb = createMockDb({
      accounting_events: [evt],
      accounting_event_lines: makeLines(evt.id),
    });
    _setAccountingDbClient(mockDb);

    const adapter = MockErpProviderAdapter.createRejected('Invalid fiscal year 2025', 'MOCK_ERP');
    const ctx = makeCtx();
    await new AccountingService(ctx).dispatchSingleEvent(evt.id, adapter);

    const row = mockDb.state.accounting_events.find((e) => e.id === evt.id);
    assert.equal(row.failure_reason, 'Invalid fiscal year 2025');
    console.log('✓ 18. Failure reason recorded accurately on failed and rejected events');
  }

  // Test 19: No real network access
  {
    // Verify that global fetch is NOT called during mock dispatch
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error('NETWORK CALL DETECTED');
    }) as any;

    try {
      const evt = makeEvent({ id: 'evt-net-1' });
      const mockDb = createMockDb({
        accounting_events: [evt],
        accounting_event_lines: makeLines(evt.id),
      });
      _setAccountingDbClient(mockDb);

      const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
      await new AccountingService(makeCtx()).dispatchSingleEvent(evt.id, adapter);
      assert.equal(fetchCalled, false);
      console.log('✓ 19. No network calls made during outbox dispatch execution');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // Test 20: No real ERP credentials present
  {
    const envVars = Object.keys(process.env);
    const forbiddenPatterns = ['JURNAL_API_KEY', 'ACCURATE_SECRET', 'SAP_PASSWORD', 'NETSUITE_TOKEN'];
    for (const pattern of forbiddenPatterns) {
      assert.equal(envVars.includes(pattern), false, `Forbidden ERP credential variable found: ${pattern}`);
    }
    console.log('✓ 20. Zero real ERP credentials or secrets present');
  }

  // Test 21: Legacy finance tables isolation
  {
    const mockDb = createMockDb({
      finance_journals: [{ id: 'fj-1', memo: 'baseline' }],
      finance_journal_entries: [{ id: 'fje-1', account: '1-10100' }],
      invoices: [{ id: 'inv-1', number: 'INV-001' }],
    });
    _setAccountingDbClient(mockDb);

    const evt = makeEvent({ id: 'evt-leg-1' });
    mockDb.state.accounting_events.push(evt);
    mockDb.state.accounting_event_lines.push(...makeLines(evt.id));

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    await new AccountingService(makeCtx()).dispatchSingleEvent(evt.id, adapter);

    // Verify legacy tables are completely untouched
    assert.equal(mockDb.state.finance_journals.length, 1);
    assert.equal(mockDb.state.finance_journal_entries.length, 1);
    assert.equal(mockDb.state.invoices.length, 1);
    console.log('✓ 21. Legacy finance tables (journals, entries, invoices) are 100% isolated and untouched');
  }

  // Test 22: AR/AP table isolation
  {
    const mockDb = createMockDb({
      fin_ar_ap: [],
    });
    _setAccountingDbClient(mockDb);

    const evt = makeEvent({ id: 'evt-arap-1' });
    mockDb.state.accounting_events.push(evt);
    mockDb.state.accounting_event_lines.push(...makeLines(evt.id));

    const adapter = MockErpProviderAdapter.createAcknowledged('MOCK_ERP');
    await new AccountingService(makeCtx()).dispatchSingleEvent(evt.id, adapter);

    assert.equal(mockDb.state.fin_ar_ap.length, 0);
    console.log('✓ 22. fin_ar_ap table remains completely unmutated and isolated');
  }

  // Cleanup DB client injection
  _setAccountingDbClient(null);

  console.log('--- ALL 22 ERP ACCOUNTING DISPATCH TESTS PASSED ---');
  return { pass: true, count: 22 };
}

// Direct execution when invoked via tsx/node
if (require.main === module || process.argv[1]?.includes('erp-accounting-dispatch')) {
  runErpAccountingDispatchSuite().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}
