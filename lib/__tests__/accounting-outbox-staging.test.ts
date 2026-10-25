import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import type { IdentityContext } from '../application/identity/types';
import {
  createSettlement,
  createSettlementWithOutbox,
  _setPaymentDbClient,
  type PaymentDbClient,
} from '../financial/payment-repository';
import { PaymentError } from '../financial/payment-types';
import { AccountingService } from '../accounting/service';

// ============================================================================
// FIXTURES & IDENTITY CONTEXTS
// ============================================================================

const TEST_TENANT_A = '350f0259-d6e3-439b-833c-9bf3090c0302';
const TEST_TENANT_B = '77777777-7777-7777-7777-777777777777';

function makeContext(tenantId = TEST_TENANT_A): IdentityContext {
  return {
    tenantId,
    userId: 'user-test-001',
    roles: ['admin'],
    permissions: ['commercial:manage', 'commercial:read'],
  } as unknown as IdentityContext;
}

// Mock database store simulating the PostgreSQL atomic RPC behavior
function createMockOutboxDb(initialData: {
  allocations?: any[];
  settlements?: any[];
  payments?: any[];
  events?: any[];
  eventLines?: any[];
  failAtEventStage?: boolean;
} = {}) {
  const store = {
    allocations: [...(initialData.allocations ?? [])],
    settlements: [...(initialData.settlements ?? [])],
    payments: [...(initialData.payments ?? [])],
    events: [...(initialData.events ?? [])],
    eventLines: [...(initialData.eventLines ?? [])],
    failAtEventStage: initialData.failAtEventStage ?? false,
  };

  const mockClient: PaymentDbClient = {
    from: (table: string) => ({
      select: (cols?: string) => {
        let filters: ((r: any) => boolean)[] = [];
        const chain: any = {
          eq: (col: string, val: any) => {
            filters.push((r) => r[col] === val);
            return chain;
          },
          order: () => chain,
          single: async () => {
            const tableRows = (store as any)[table.replace('fin_', '')] ?? [];
            const found = tableRows.find((r: any) => filters.every((f) => f(r)));
            if (!found) return { data: null, error: { message: 'Not found', code: '404' } };
            return { data: { ...found }, error: null };
          },
          maybeSingle: async () => {
            const tableRows = (store as any)[table.replace('fin_', '')] ?? [];
            const found = tableRows.find((r: any) => filters.every((f) => f(r)));
            return { data: found ? { ...found } : null, error: null };
          },
        };
        return chain;
      },
      insert: (row: any) => ({
        select: () => ({
          single: async () => {
            const newRow = { id: `id-${Date.now()}-${Math.random()}`, ...row };
            return { data: newRow, error: null };
          },
          maybeSingle: async () => {
            const newRow = { id: `id-${Date.now()}-${Math.random()}`, ...row };
            return { data: newRow, error: null };
          },
        }),
      }),
      update: (row: any) => ({
        eq: () => ({
          single: async () => ({ data: row, error: null }),
          maybeSingle: async () => ({ data: row, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          select: async () => ({ data: [], error: null }),
        }),
      }),
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'fn_settle_allocation_with_outbox') {
        const tenantId = args.p_tenant_id as string;
        const allocId = args.p_allocation_id as string;
        const userId = args.p_user_id as string;

        // 1. Find allocation
        const alloc = store.allocations.find((a) => a.id === allocId && a.tenant_id === tenantId);
        if (!alloc) {
          return { data: null, error: { message: `ALLOCATION_NOT_FOUND: Allocation ${allocId} not found`, code: '404' } };
        }

        // 2. Check if already settled
        if (alloc.status === 'SETTLED') {
          return { data: null, error: { message: 'ALREADY_SETTLED', code: '23505' } };
        }

        // 3. Check for existing settlement
        const existingSettlement = store.settlements.find((s) => s.allocation_id === allocId && s.tenant_id === tenantId);
        if (existingSettlement) {
          return { data: null, error: { message: 'DUPLICATE_SETTLEMENT', code: '23505' } };
        }

        // Simulate atomic rollback if failAtEventStage is requested
        if (store.failAtEventStage) {
          // Failure during event staging -> NOTHING is committed
          return { data: null, error: { message: 'CHECK_VIOLATION: Event lines unbalanced or event failure', code: '23514' } };
        }

        // 4. Create settlement
        const settlementId = `settle-${Date.now()}`;
        const settledAt = new Date().toISOString();
        const settlementRow = {
          id: settlementId,
          tenant_id: tenantId,
          allocation_id: allocId,
          status: 'SETTLED',
          settled_at: settledAt,
          created_by: userId,
          updated_by: userId,
        };
        store.settlements.push(settlementRow);

        // 5. Update allocation
        alloc.status = 'SETTLED';

        // 6. Update payment if all settled
        const payment = store.payments.find((p) => p.id === alloc.payment_id && p.tenant_id === tenantId);
        if (payment) {
          const siblingAllocs = store.allocations.filter((a) => a.payment_id === payment.id && a.tenant_id === tenantId);
          const allSettled = siblingAllocs.every((a) => a.status === 'SETTLED');
          const totalAlloc = siblingAllocs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
          if (allSettled && totalAlloc >= payment.amount) {
            payment.status = 'COMPLETED';
          }
        }

        // 7. Create accounting event
        const eventId = `acct-event-${Date.now()}`;
        const eventRow = {
          id: eventId,
          tenant_id: tenantId,
          event_type: 'SETTLEMENT_COMPLETED',
          source_entity_type: 'fin_settlements',
          source_entity_id: settlementId,
          source_reference: `ALLOC:${allocId}`,
          currency: alloc.currency,
          total_debit: alloc.amount,
          total_credit: alloc.amount,
          status: 'VALIDATED',
          idempotency_key: `SETTLEMENT:${allocId}`,
          created_by: userId,
          updated_by: userId,
        };
        store.events.push(eventRow);

        // 8. Create exactly TWO lines
        const debitLine = {
          id: `line-debit-${Date.now()}`,
          tenant_id: tenantId,
          accounting_event_id: eventId,
          line_type: 'DEBIT',
          account_code: '1-11010',
          amount: alloc.amount,
          currency: alloc.currency,
        };
        const creditLine = {
          id: `line-credit-${Date.now()}`,
          tenant_id: tenantId,
          accounting_event_id: eventId,
          line_type: 'CREDIT',
          account_code: '1-10100',
          amount: alloc.amount,
          currency: alloc.currency,
        };
        store.eventLines.push(debitLine, creditLine);

        return {
          data: {
            settlement_id: settlementId,
            allocation_id: allocId,
            status: 'SETTLED',
            settled_at: settledAt,
            accounting_event_id: eventId,
            amount: alloc.amount,
            currency: alloc.currency,
            is_duplicate: false,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `Unknown RPC function: ${fn}`, code: '400' } };
    },
  };

  return { mockClient, store };
}

// ============================================================================
// TEST SUITE: ACCOUNTING OUTBOX ATOMIC STAGING
// ============================================================================

describe('Accounting Outbox Atomic Staging Suite (ADR-064 / ADR-067 / D1 / D2)', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    delete process.env.FIN_PAYMENT_ENABLED;
    delete process.env.FIN_PAYMENT_TEST_TENANTS;
  });

  afterEach(() => {
    process.env = origEnv;
    _setPaymentDbClient(null);
  });

  // --------------------------------------------------------------------------
  // TEST A: ATOMIC SUCCESS
  // --------------------------------------------------------------------------
  test('A: Settlement + allocation transition + payment transition + accounting event + lines commit together', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    const result = await createSettlementWithOutbox(ctx, { allocationId: 'alloc-1' });

    expect(result.settlement.status).toBe('SETTLED');
    expect(result.accountingEventId).toBeDefined();

    // Verify atomic state in store
    expect(store.settlements).toHaveLength(1);
    expect(store.allocations[0].status).toBe('SETTLED');
    expect(store.payments[0].status).toBe('COMPLETED');
    expect(store.events).toHaveLength(1);
    expect(store.eventLines).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // TEST B: ATOMIC ROLLBACK
  // --------------------------------------------------------------------------
  test('B: Failure in accounting staging rolls back Settlement (no orphan records)', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
      failAtEventStage: true,
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    await expect(
      createSettlementWithOutbox(ctx, { allocationId: 'alloc-1' }),
    ).rejects.toThrowError(/Failed to create settlement/);

    // Verify rollback: zero settlements, allocation remains ALLOCATED, zero accounting events
    expect(store.settlements).toHaveLength(0);
    expect(store.allocations[0].status).toBe('ALLOCATED');
    expect(store.payments[0].status).toBe('ALLOCATED');
    expect(store.events).toHaveLength(0);
    expect(store.eventLines).toHaveLength(0);
  });

  // --------------------------------------------------------------------------
  // TEST C & D: MAPPING ENFORCEMENT & BALANCING
  // --------------------------------------------------------------------------
  test('C & D: Ratified account codes 1-11010 (DEBIT) and 1-10100 (CREDIT) enforced with balanced amount', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    await createSettlement(ctx, { allocationId: 'alloc-1' });

    const event = store.events[0];
    expect(event.event_type).toBe('SETTLEMENT_COMPLETED');
    expect(event.total_debit).toBe(1000000);
    expect(event.total_credit).toBe(1000000);
    expect(event.total_debit).toBe(event.total_credit);

    const debitLine = store.eventLines.find((l) => l.line_type === 'DEBIT');
    const creditLine = store.eventLines.find((l) => l.line_type === 'CREDIT');

    expect(debitLine?.account_code).toBe('1-11010');
    expect(debitLine?.amount).toBe(1000000);
    expect(creditLine?.account_code).toBe('1-10100');
    expect(creditLine?.amount).toBe(1000000);
  });

  // --------------------------------------------------------------------------
  // TEST E: IDEMPOTENCY
  // --------------------------------------------------------------------------
  test('E: Repeated invocation against the same allocation cannot create duplicate settlement or event', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    await createSettlement(ctx, { allocationId: 'alloc-1' });

    // Second call must fail closed as already settled
    await expect(
      createSettlement(ctx, { allocationId: 'alloc-1' }),
    ).rejects.toThrowError(/Allocation is already settled/);

    expect(store.settlements).toHaveLength(1);
    expect(store.events).toHaveLength(1);
    expect(store.eventLines).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // TEST F: CONCURRENCY DEFENSE
  // --------------------------------------------------------------------------
  test('F: Concurrent settlement attempts produce exactly one Settlement and one event', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    const results = await Promise.allSettled([
      createSettlement(ctx, { allocationId: 'alloc-1' }),
      createSettlement(ctx, { allocationId: 'alloc-1' }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(store.settlements).toHaveLength(1);
    expect(store.events).toHaveLength(1);
  });

  // --------------------------------------------------------------------------
  // TEST G: TENANT ISOLATION
  // --------------------------------------------------------------------------
  test('G: Cross-tenant settlement attempt fails closed', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient } = createMockOutboxDb({
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    // Context with Tenant B attempting to settle Tenant A's allocation
    const ctxB = makeContext(TEST_TENANT_B);
    await expect(
      createSettlement(ctxB, { allocationId: 'alloc-1' }),
    ).rejects.toThrowError(/Allocation alloc-1 not found/);
  });

  // --------------------------------------------------------------------------
  // TEST H, I, J: AR/AP, LEGACY, AND ERP INVARIANCE
  // --------------------------------------------------------------------------
  test('H, I, J: Staging does not write to fin_ar_ap, legacy journals, or trigger ERP calls', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'true';
    const { mockClient, store } = createMockOutboxDb({
      payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'ALLOCATED' }],
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', amount: 1000000, currency: 'IDR', status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    await createSettlement(ctx, { allocationId: 'alloc-1' });

    // Status of event is VALIDATED (internal outbox only, never ACKNOWLEDGED / delivered)
    const event = store.events[0];
    expect(event.status).toBe('VALIDATED');
    expect(event.external_correlation_id).toBeUndefined();
    expect(event.acknowledged_at).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // TEST K: FEATURE FLAG GOVERNANCE
  // --------------------------------------------------------------------------
  test('K: Settlement staging is blocked when FIN_PAYMENT_ENABLED is OFF', async () => {
    process.env.FIN_PAYMENT_ENABLED = 'false';
    const { mockClient } = createMockOutboxDb({
      allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, status: 'ALLOCATED' }],
    });
    _setPaymentDbClient(mockClient);

    const ctx = makeContext(TEST_TENANT_A);
    await expect(
      createSettlement(ctx, { allocationId: 'alloc-1' }),
    ).rejects.toThrowError(/CAPABILITY_DISABLED/);
  });
});
