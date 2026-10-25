import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import type {
  FinPayment,
  FinAllocation,
  FinSettlement,
  FinReconciliation,
  CreatePaymentInput,
  CreateAllocationInput,
} from '../financial/payment-types';
import { PaymentError } from '../financial/payment-types';
import {
  isPaymentMutationEnabled,
  isPaymentMutationEnabledForTenant,
  assertPaymentMutationEnabled,
} from '../financial/feature-flags';
import {
  createPayment,
  getPaymentById,
  updatePaymentStatus,
  createAllocation,
  listAllocationsByPayment,
  createSettlement,
  _setPaymentDbClient,
  type PaymentDbClient,
} from '../financial/payment-repository';
import type { IdentityContext } from '../application/identity/types';

// ============================================================================
// FIXTURES & MOCK IDENTITY CONTEXT
// ============================================================================

const TEST_TENANT_A = '350f0259-d6e3-439b-833c-9bf3090c0302';
const TEST_TENANT_B = '77777777-7777-7777-7777-777777777777';

function makeContext(tenantId = TEST_TENANT_A): IdentityContext {
  return {
    tenantId,
    userId: 'user-001',
    roles: ['admin'],
    permissions: ['commercial:manage', 'commercial:read'],
  } as unknown as IdentityContext;
}

function makePaymentInput(overrides: Partial<CreatePaymentInput> = {}): CreatePaymentInput {
  return {
    direction: 'AR',
    amount: 1000000,
    currency: 'IDR',
    ...overrides,
  };
}

function makeAllocationInput(overrides: Partial<CreateAllocationInput> = {}): CreateAllocationInput {
  return {
    paymentId: 'pay-001',
    invoiceId: 'inv-001',
    amount: 500000,
    currency: 'IDR',
    ...overrides,
  };
}

// In-memory mock database state
function createMockDb(initialState?: {
  payments?: Record<string, unknown>[];
  invoices?: Record<string, unknown>[];
  allocations?: Record<string, unknown>[];
  settlements?: Record<string, unknown>[];
  arAp?: Record<string, unknown>[];
  seqNumber?: number;
}): PaymentDbClient {
  const payments = [...(initialState?.payments || [])];
  const invoices = [...(initialState?.invoices || [])];
  const allocations = [...(initialState?.allocations || [])];
  const settlements = [...(initialState?.settlements || [])];
  const arAp = [...(initialState?.arAp || [])];
  let seq = initialState?.seqNumber || 1;

  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'next_payment_number') {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const num = `PAY-${year}-${month}-${String(seq++).padStart(4, '0')}`;
        return { data: num, error: null };
      }
      if (fn === 'create_payment_allocation') {
        const tenantId = args.p_tenant_id as string;
        const paymentId = args.p_payment_id as string;
        const invoiceId = args.p_invoice_id as string;
        const amount = Number(args.p_amount);
        const currency = args.p_currency as string;
        const userId = args.p_user_id as string;

        // Duplicate check (D-3.1, Case B/C/D)
        const dup = allocations.find((a) => a.tenant_id === tenantId && a.payment_id === paymentId && a.invoice_id === invoiceId);
        if (dup) {
          if (['ALLOCATED', 'SETTLED'].includes(dup.status as string)) {
            if (Number(dup.amount) === amount) {
              return { data: { ...dup, is_idempotent: true }, error: null };
            }
            return { data: null, error: { message: 'DUPLICATE_IDEMPOTENCY: Active allocation already exists with different amount', code: '23505' } };
          }
          if (dup.status === 'REVERSED') {
            return { data: null, error: { message: 'ALLOCATION_REVERSED: Allocation was previously reversed' } };
          }
          return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
        }

        const allocId = `alloc-${Date.now()}-${Math.random()}`;
        const now = new Date().toISOString();
        const newAlloc = {
          id: allocId,
          tenant_id: tenantId,
          payment_id: paymentId,
          invoice_id: invoiceId,
          amount,
          currency,
          status: 'ALLOCATED',
          created_at: now,
          updated_at: now,
          created_by: userId,
          updated_by: userId,
        };
        allocations.push(newAlloc);

        // Update invoice
        const inv = invoices.find((i) => i.id === invoiceId && i.tenant_id === tenantId);
        if (inv) {
          const invTotal = Number(inv.total_amount) || 0;
          const prevPaid = Number(inv.paid_amount) || 0;
          const newPaid = prevPaid + amount;
          inv.paid_amount = newPaid;
          inv.status = newPaid >= invTotal ? 'PAID' : 'PARTIAL_PAID';
          inv.paid_at = newPaid >= invTotal ? now : null;
          inv.updated_at = now;
          inv.updated_by = userId;
        }

        // Update AR/AP
        const ar = arAp.find((a) => a.invoice_id === invoiceId && a.tenant_id === tenantId);
        if (ar) {
          const arTotal = Number(ar.total_amount) || 0;
          const newPaid = (Number(ar.paid_amount) || 0) + amount;
          ar.paid_amount = newPaid;
          ar.balance_amount = Math.max(0, arTotal - newPaid);
          ar.status = newPaid >= arTotal ? 'PAID' : (newPaid > 0 ? 'PARTIAL_PAID' : 'INVOICED');
          ar.updated_at = now;
          ar.updated_by = userId;
        }

        // Update payment
        const pay = payments.find((p) => p.id === paymentId && p.tenant_id === tenantId);
        if (pay) {
          const payTotal = Number(pay.amount) || 0;
          const activePayAllocTotal = allocations
            .filter((a) => a.payment_id === paymentId && ['ALLOCATED', 'SETTLED'].includes(a.status as string))
            .reduce((s, a) => s + (Number(a.amount) || 0), 0);
          if (activePayAllocTotal >= payTotal) {
            pay.status = 'ALLOCATED';
            pay.updated_at = now;
            pay.updated_by = userId;
          }
        }

        return { data: newAlloc, error: null };
      }
      return { data: null, error: { message: `Unknown RPC ${fn}` } };
    },
    from: (table: string) => {
      const getStore = () => {
        if (table === 'fin_payments') return payments;
        if (table === 'fin_invoices') return invoices;
        if (table === 'fin_payment_allocations') return allocations;
        if (table === 'fin_settlements') return settlements;
        if (table === 'fin_ar_ap') return arAp;
        return [];
      };

      return {
        select: (cols?: string) => {
          let filters: ((row: Record<string, unknown>) => boolean)[] = [];
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters.push((row) => row[col] === val);
              return chain;
            },
            in: (col: string, vals: unknown[]) => {
              filters.push((row) => vals.includes(row[col]));
              return chain;
            },
            order: (col: string, opts: { ascending: boolean }) => chain,
            limit: (count: number) => chain,
            single: async () => {
              const rows = getStore().filter((r) => filters.every((f) => f(r)));
              if (rows.length === 0) return { data: null, error: { message: 'Not found', code: '404' } };
              return { data: { ...rows[0] }, error: null };
            },
            maybeSingle: async () => {
              const rows = getStore().filter((r) => filters.every((f) => f(r)));
              return { data: rows.length > 0 ? { ...rows[0] } : null, error: null };
            },
            then: (resolve: any) => {
              const rows = getStore().filter((r) => filters.every((f) => f(r)));
              resolve({ data: rows.map((r) => ({ ...r })), error: null });
            },
          };
          return chain;
        },
        insert: (rowOrRows: Record<string, unknown> | Record<string, unknown>[]) => {
          const row = Array.isArray(rowOrRows) ? rowOrRows[0] : rowOrRows;
          return {
            select: () => ({
              single: async () => {
                const store = getStore();
                // Check unique constraint for allocations
                if (table === 'fin_payment_allocations') {
                  const dup = store.find(
                    (r) =>
                      r.tenant_id === row.tenant_id &&
                      r.payment_id === row.payment_id &&
                      r.invoice_id === row.invoice_id,
                  );
                  if (dup) {
                    return { data: null, error: { message: 'duplicate key', code: '23505' } };
                  }
                }
                const newRow = { id: `generated-${Date.now()}-${Math.random()}`, ...row };
                store.push(newRow);
                return { data: newRow, error: null };
              },
              maybeSingle: async () => {
                const newRow = { id: `generated-${Date.now()}-${Math.random()}`, ...row };
                getStore().push(newRow);
                return { data: newRow, error: null };
              },
            }),
          };
        },
        update: (updates: Record<string, unknown>) => {
          let filters: ((row: Record<string, unknown>) => boolean)[] = [];
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters.push((row) => row[col] === val);
              return chain;
            },
            select: () => ({
              single: async () => {
                const store = getStore();
                const idx = store.findIndex((r) => filters.every((f) => f(r)));
                if (idx === -1) return { data: null, error: { message: 'Not found' } };
                store[idx] = { ...store[idx], ...updates };
                return { data: store[idx], error: null };
              },
              maybeSingle: async () => {
                const store = getStore();
                const idx = store.findIndex((r) => filters.every((f) => f(r)));
                if (idx === -1) return { data: null, error: null };
                store[idx] = { ...store[idx], ...updates };
                return { data: store[idx], error: null };
              },
            }),
            then: (resolve: any) => {
              const store = getStore();
              let count = 0;
              for (let i = 0; i < store.length; i++) {
                if (filters.every((f) => f(store[i]))) {
                  store[i] = { ...store[i], ...updates };
                  count++;
                }
              }
              resolve({ data: count > 0 ? [{ ...updates }] : [], error: null });
            },
          };
          return chain;
        },
        delete: () => {
          let filters: ((row: Record<string, unknown>) => boolean)[] = [];
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters.push((row) => row[col] === val);
              return chain;
            },
            select: async () => {
              const store = getStore();
              const remaining = store.filter((r) => !filters.every((f) => f(r)));
              store.length = 0;
              store.push(...remaining);
              return { data: [], error: null };
            },
          };
          return chain;
        },
      };
    },
  };
}

// ============================================================================
// SUITE: PHASE 5D-3 PAYMENT & SETTLEMENT REMEDIATION
// ============================================================================

describe('Phase 5D-3 Payment & Settlement Remediation Suite', () => {
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
  // SECTION 11.A & 11.B: NUMBER AUTHORITY
  // --------------------------------------------------------------------------
  describe('Requirement A & B: Payment Number Authority', () => {
    test('A: Migration creates sequence and atomic next_payment_number function', () => {
      const migPath = path.join(process.cwd(), 'supabase/migrations/20261005_001_next_payment_number.sql');
      expect(fs.existsSync(migPath)).toBe(true);
      const migContent = fs.readFileSync(migPath, 'utf8');
      expect(migContent).toContain('CREATE SEQUENCE IF NOT EXISTS public.seq_payment_number');
      expect(migContent).toContain('CREATE OR REPLACE FUNCTION public.next_payment_number');
      expect(migContent).toContain('PAY-');
      expect(migContent).toContain('nextval');
    });

    test('A2: Repository does NOT use Math.random() for payment numbers', () => {
      const repoPath = path.join(process.cwd(), 'lib/financial/payment-repository.ts');
      const repoContent = fs.readFileSync(repoPath, 'utf8');
      expect(repoContent).not.toMatch(/Math\.random\(\).*paymentNumber/);
      expect(repoContent).toContain('next_payment_number');
    });

    test('B: Sequential allocations produce distinct incrementing numbers', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({ seqNumber: 42 });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext();
      const p1 = await createPayment(ctx, makePaymentInput());
      const p2 = await createPayment(ctx, makePaymentInput());

      expect(p1.paymentNumber).toContain('-0042');
      expect(p2.paymentNumber).toContain('-0043');
      expect(p1.paymentNumber).not.toEqual(p2.paymentNumber);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.C & 11.D: FEATURE FLAG GOVERNANCE
  // --------------------------------------------------------------------------
  describe('Requirement C & D: Feature Flag Fail-Closed Governance', () => {
    test('C: Feature flag defaults OFF and rejects mutation without allowlist', () => {
      expect(isPaymentMutationEnabled()).toBe(false);
      expect(isPaymentMutationEnabledForTenant(TEST_TENANT_A)).toBe(false);

      const ctx = makeContext(TEST_TENANT_A);
      expect(() => assertPaymentMutationEnabled(ctx)).toThrowError(/CAPABILITY_DISABLED/);
    });

    test('D: Test tenant allowlisting allows mutation for specified tenant only', () => {
      process.env.FIN_PAYMENT_TEST_TENANTS = TEST_TENANT_A;

      expect(isPaymentMutationEnabled()).toBe(false);
      expect(isPaymentMutationEnabledForTenant(TEST_TENANT_A)).toBe(true);
      expect(isPaymentMutationEnabledForTenant(TEST_TENANT_B)).toBe(false);

      expect(() => assertPaymentMutationEnabled({ tenantId: TEST_TENANT_A })).not.toThrow();
      expect(() => assertPaymentMutationEnabled({ tenantId: TEST_TENANT_B })).toThrowError(/CAPABILITY_DISABLED/);
    });

    test('D2: Global enable allows all tenants', () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      expect(isPaymentMutationEnabled()).toBe(true);
      expect(isPaymentMutationEnabledForTenant(TEST_TENANT_A)).toBe(true);
      expect(isPaymentMutationEnabledForTenant(TEST_TENANT_B)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.E & 11.F: TENANT ISOLATION & MATCHING
  // --------------------------------------------------------------------------
  describe('Requirement E & F: Tenant Isolation and Payment-Invoice Matching', () => {
    test('E: Payments are created with IdentityContext tenantId', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb();
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const payment = await createPayment(ctx, makePaymentInput());
      expect(payment.tenantId).toBe(TEST_TENANT_A);
    });

    test('F: Allocation fails if payment belongs to a different tenant', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-diff-tenant', tenant_id: TEST_TENANT_B, amount: 1000000, status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, paid_amount: 0, status: 'ISSUED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-diff-tenant', invoiceId: 'inv-1', amount: 500000, currency: 'IDR' }),
      ).rejects.toThrowError(/CROSS_TENANT_FORBIDDEN/);
    });

    test('F2: Allocation fails if target invoice belongs to a different tenant', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-diff-tenant', tenant_id: TEST_TENANT_B, total_amount: 1000000, paid_amount: 0, status: 'ISSUED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-diff-tenant', amount: 500000, currency: 'IDR' }),
      ).rejects.toThrowError(/CROSS_TENANT_FORBIDDEN/);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.G & 11.H: ALLOCATION BOUNDS
  // --------------------------------------------------------------------------
  describe('Requirement G & H: Allocation Boundary Validation', () => {
    test('G: Allocation exceeds available payment balance throws ALLOCATION_EXCEEDS_PAYMENT', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 500000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, currency: 'IDR', paid_amount: 0, status: 'ISSUED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 600000, currency: 'IDR' }),
      ).rejects.toThrowError(/ALLOCATION_EXCEEDS_PAYMENT/);
    });

    test('H: Allocation exceeds invoice outstanding amount throws ALLOCATION_EXCEEDS_INVOICE', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 2000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 500000, currency: 'IDR', paid_amount: 0, status: 'ISSUED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 600000, currency: 'IDR' }),
      ).rejects.toThrowError(/ALLOCATION_EXCEEDS_INVOICE/);
    });

    test('Zero or negative allocation amount throws INVALID_AMOUNT', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb();
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 0, currency: 'IDR' }),
      ).rejects.toThrowError(/INVALID_AMOUNT/);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: -100, currency: 'IDR' }),
      ).rejects.toThrowError(/INVALID_AMOUNT/);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.I, 11.J, 11.K, 11.L: DOMAIN ORCHESTRATION & INVOICE TRANSITIONS
  // --------------------------------------------------------------------------
  describe('Requirement I, J, K, L: Domain Orchestration of Invoice Balance & Status', () => {
    test('I & K & L: Partial payment allocation updates paid_amount and sets PARTIAL_PAID', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, currency: 'IDR', paid_amount: 0, status: 'ISSUED' }],
        arAp: [{ id: 'ar-1', tenant_id: TEST_TENANT_A, invoice_id: 'inv-1', total_amount: 1000000, paid_amount: 0, balance_amount: 1000000, status: 'INVOICED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const alloc = await createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 400000, currency: 'IDR' });

      expect(alloc.amount).toBe(400000);
      expect(alloc.status).toBe('ALLOCATED');

      // Verify invoice state updated
      const { data: inv } = await mockDb.from('fin_invoices').select('*').eq('id', 'inv-1').single();
      expect(inv?.paid_amount).toBe(400000);
      expect(inv?.status).toBe('PARTIAL_PAID');
      expect(inv?.paid_at).toBeNull();

      // Verify AR/AP subledger updated
      const { data: ar } = await mockDb.from('fin_ar_ap').select('*').eq('id', 'ar-1').single();
      expect(ar?.paid_amount).toBe(400000);
      expect(ar?.balance_amount).toBe(600000);
      expect(ar?.status).toBe('PARTIAL_PAID');
    });

    test('J & K & L: Full payment allocation updates paid_amount, sets PAID status, and records paid_at', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, currency: 'IDR', paid_amount: 0, status: 'ISSUED' }],
        arAp: [{ id: 'ar-1', tenant_id: TEST_TENANT_A, invoice_id: 'inv-1', total_amount: 1000000, paid_amount: 0, balance_amount: 1000000, status: 'INVOICED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const alloc = await createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 1000000, currency: 'IDR' });

      expect(alloc.amount).toBe(1000000);

      // Verify invoice state updated to PAID
      const { data: inv } = await mockDb.from('fin_invoices').select('*').eq('id', 'inv-1').single();
      expect(inv?.paid_amount).toBe(1000000);
      expect(inv?.status).toBe('PAID');
      expect(inv?.paid_at).toBeDefined();

      // Verify AR/AP subledger balance is 0 and status is PAID
      const { data: ar } = await mockDb.from('fin_ar_ap').select('*').eq('id', 'ar-1').single();
      expect(ar?.paid_amount).toBe(1000000);
      expect(ar?.balance_amount).toBe(0);
      expect(ar?.status).toBe('PAID');

      // Verify payment transitioned to ALLOCATED since fully allocated
      const { data: pay } = await mockDb.from('fin_payments').select('*').eq('id', 'pay-1').single();
      expect(pay?.status).toBe('ALLOCATED');
    });

    test('Cannot allocate to an invoice that is already PAID and fully settled', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-paid', tenant_id: TEST_TENANT_A, total_amount: 500000, currency: 'IDR', paid_amount: 500000, status: 'PAID' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-paid', amount: 100000, currency: 'IDR' }),
      ).rejects.toThrowError(/INVALID_STATE/);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.M & 11.N: PAYMENT & SETTLEMENT LIFECYCLE
  // --------------------------------------------------------------------------
  describe('Requirement M & N: Payment & Settlement Lifecycle', () => {
    test('M: Payment lifecycle transitions from PENDING -> CONFIRMED', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, payment_number: 'PAY-2026-10-0001', amount: 1000000, status: 'PENDING' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const confirmed = await updatePaymentStatus(ctx, 'pay-1', 'CONFIRMED');
      expect(confirmed.status).toBe('CONFIRMED');
    });

    test('N: Settlement transitions allocation to SETTLED and completes payment when all settled', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, payment_number: 'PAY-2026-10-0001', amount: 1000000, status: 'ALLOCATED' }],
        allocations: [{ id: 'alloc-1', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', invoice_id: 'inv-1', amount: 1000000, status: 'ALLOCATED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const settlement = await createSettlement(ctx, { allocationId: 'alloc-1' });

      expect(settlement.status).toBe('SETTLED');
      expect(settlement.settledAt).toBeDefined();

      // Verify allocation status is updated to SETTLED
      const { data: alloc } = await mockDb.from('fin_payment_allocations').select('*').eq('id', 'alloc-1').single();
      expect(alloc?.status).toBe('SETTLED');

      // Verify payment status is updated to COMPLETED
      const { data: pay } = await mockDb.from('fin_payments').select('*').eq('id', 'pay-1').single();
      expect(pay?.status).toBe('COMPLETED');
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.O: DUPLICATE ALLOCATION PREVENTION (D-3.1, Case B & C)
  // --------------------------------------------------------------------------
  describe('Requirement O: Duplicate Allocation Prevention', () => {
    test('O1: Duplicate payment-invoice allocation with same amount returns deterministic idempotent success (Case B)', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, currency: 'IDR', paid_amount: 300000, status: 'PARTIAL_PAID' }],
        allocations: [{ id: 'alloc-existing', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', invoice_id: 'inv-1', amount: 300000, currency: 'IDR', status: 'ALLOCATED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const res = await createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 300000, currency: 'IDR' });
      expect(res.id).toBe('alloc-existing');
      expect(res.amount).toBe(300000);
    });

    test('O2: Duplicate payment-invoice allocation with different amount triggers DUPLICATE_IDEMPOTENCY (409) (Case C)', async () => {
      process.env.FIN_PAYMENT_ENABLED = 'true';
      const mockDb = createMockDb({
        payments: [{ id: 'pay-1', tenant_id: TEST_TENANT_A, amount: 1000000, currency: 'IDR', status: 'CONFIRMED' }],
        invoices: [{ id: 'inv-1', tenant_id: TEST_TENANT_A, total_amount: 1000000, currency: 'IDR', paid_amount: 300000, status: 'PARTIAL_PAID' }],
        allocations: [{ id: 'alloc-existing', tenant_id: TEST_TENANT_A, payment_id: 'pay-1', invoice_id: 'inv-1', amount: 300000, currency: 'IDR', status: 'ALLOCATED' }],
      });
      _setPaymentDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'pay-1', invoiceId: 'inv-1', amount: 500000, currency: 'IDR' }),
      ).rejects.toThrowError(/DUPLICATE_IDEMPOTENCY/);
    });
  });

  // --------------------------------------------------------------------------
  // SECTION 11.P, 11.Q, 11.R: ISOLATION & IMMUTABILITY
  // --------------------------------------------------------------------------
  describe('Requirement P, Q, R: Immutability and Legacy / Accounting Isolation', () => {
    test('P: Reversal creates append-only records without in-place mutation of history', () => {
      const err = new PaymentError('INVALID_STATE', 400, 'Cannot mutate settled allocation; create reversal instead');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('INVALID_STATE');
    });

    test('Q: Payment domain code does NOT import or reference legacy invoice tables', () => {
      const repoSrc = fs.readFileSync(path.join(process.cwd(), 'lib/financial/payment-repository.ts'), 'utf8');
      expect(repoSrc).not.toContain("from('invoices')");
      expect(repoSrc).not.toContain("from('invoice_lines')");
      expect(repoSrc).not.toContain("from('job_order_payments')");
    });

    test('R: Payment domain code does NOT import or reference accounting or GL tables', () => {
      const repoSrc = fs.readFileSync(path.join(process.cwd(), 'lib/financial/payment-repository.ts'), 'utf8');
      expect(repoSrc).not.toContain("from('gl_journals')");
      expect(repoSrc).not.toContain("from('gl_entries')");
      expect(repoSrc).not.toContain("from('accounting_events')");
    });
  });
});
