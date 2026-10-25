/**
 * Sentralogis — Phase 5D-2 / Phase 5D-3 / R2-C.4N
 * lib/__tests__/u26-invoice-lifecycle-ar-remediation.test.ts
 *
 * Dedicated forensic verification suite for:
 *   1. Invoice Issuance Lifecycle (D-1.A, D-2.A)
 *   2. Dedicated Transactional Payment Allocation (D-3.B, D-3.1, D-7.A, ADR-067/068)
 *   3. Authoritative AR Read Model (D-4, D-5, D-6, H-1)
 *
 * Non-negotiable Invariants Tested:
 *   - Zero client-side random generation (atomic sequence authority).
 *   - Manual explicit issuance only: DRAFT -> ISSUED. Zero auto-issuance.
 *   - issued_at is set upon issuance; historical DRAFTs remain null (D-5).
 *   - Direct sequential DB write bypass in payment-repository is sealed (routes through create_payment_allocation RPC).
 *   - Payment allocation requires dual permission: commercial:manage OR finance:manage (D-7.A).
 *   - Allocation strictly checks positive sets: payment IN ('CONFIRMED', 'COMPLETED'), invoice IN ('ISSUED', 'PARTIAL_PAID').
 *   - Allocation requires currency equality across payment, invoice, and allocation input.
 *   - Authoritative AR calculation aggregates active allocations IN ('ALLOCATED', 'SETTLED'); header paid_amount is reconciliation-only.
 *   - Inactive invoice states (DRAFT, CANCELLED, PAID) are excluded from AR outstanding balance.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { IdentityContext } from '../application/identity/types';
import {
  issueInvoice,
  getArOutstanding,
  _setFinancialDbClient,
  type FinancialDbClient,
} from '../financial/repository';
import {
  createAllocation,
  _setPaymentDbClient,
  type PaymentDbClient,
} from '../financial/payment-repository';
import { FinancialError } from '../financial/types';
import { PaymentError } from '../financial/payment-types';

const TEST_TENANT_A = '350f0259-d6e3-439b-833c-9bf3090c0302';
const TEST_TENANT_B = '77777777-7777-7777-7777-777777777777';

function makeContext(
  tenantId = TEST_TENANT_A,
  permissions = ['commercial:manage', 'commercial:read'],
): IdentityContext {
  return {
    tenantId,
    userId: 'user-001',
    roles: ['staff'],
    permissions,
  } as unknown as IdentityContext;
}

// In-memory mock DB client for Financial Repository
function createFinancialMockDb(initialState?: {
  invoices?: Record<string, unknown>[];
  allocations?: Record<string, unknown>[];
}): FinancialDbClient {
  const invoices = [...(initialState?.invoices || [])];
  const allocations = [...(initialState?.allocations || [])];

  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      return { data: null, error: { message: `Unknown RPC ${fn}` } };
    },
    from: (table: string) => {
      const getStore = () => {
        if (table === 'fin_invoices') return invoices;
        if (table === 'fin_payment_allocations') return allocations;
        return [];
      };

      return {
        select: (cols?: string) => {
          let filters: ((row: Record<string, unknown>) => boolean)[] = [];
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters.push((r) => r[col] === val);
              return chain;
            },
            in: (col: string, vals: unknown[]) => {
              filters.push((r) => vals.includes(r[col]));
              return chain;
            },
            order: (col: string, opts: { ascending: boolean }) => chain,
            limit: (count: number) => chain,
            single: async () => {
              const res = getStore().find((r) => filters.every((f) => f(r)));
              if (!res) return { data: null, error: { message: 'Not found' } };
              return { data: res, error: null };
            },
            maybeSingle: async () => {
              const res = getStore().find((r) => filters.every((f) => f(r)));
              return { data: res || null, error: null };
            },
            then: (resolve: any) => {
              const res = getStore().filter((r) => filters.every((f) => f(r)));
              resolve({ data: res, error: null });
            },
          };
          return chain;
        },
        insert: (row: any) => {
          return {
            select: () => ({
              single: async () => {
                const store = getStore();
                const newRow = Array.isArray(row) ? row[0] : row;
                const rec = { id: `gen-${Date.now()}`, ...newRow };
                store.push(rec);
                return { data: rec, error: null };
              },
              maybeSingle: async () => {
                const store = getStore();
                const newRow = Array.isArray(row) ? row[0] : row;
                const rec = { id: `gen-${Date.now()}`, ...newRow };
                store.push(rec);
                return { data: rec, error: null };
              },
            }),
          };
        },
        update: (updates: Record<string, unknown>) => {
          let filters: ((row: Record<string, unknown>) => boolean)[] = [];
          const chain: any = {
            eq: (col: string, val: unknown) => {
              filters.push((r) => r[col] === val);
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
            }),
          };
          return chain;
        },
        delete: () => {
          throw new Error('Delete not supported in mock');
        },
      };
    },
  };
}

describe('R2-C.4N: Invoice Lifecycle & AR Remediation Suite', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    process.env.FIN_PAYMENT_ENABLED = 'true';
  });

  afterEach(() => {
    process.env = origEnv;
    _setFinancialDbClient(null);
    _setPaymentDbClient(null);
  });

  // ==========================================================================
  // SECTION 1: INVOICE ISSUANCE LIFECYCLE (D-1.A, D-2.A)
  // ==========================================================================
  describe('Part 1: Invoice Issuance Lifecycle (D-1.A, D-2.A)', () => {
    test('1. Migration 033 exists and adds issued_at column to fin_invoices', () => {
      const migPath = path.join(process.cwd(), 'supabase/migrations/20261008_033_fin_invoices_issued_at.sql');
      expect(fs.existsSync(migPath)).toBe(true);
      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ NULL DEFAULT NULL');
      expect(content).not.toContain('UPDATE public.fin_invoices SET issued_at ='); // D-5: Zero backfill
    });

    test('2. Successful issuance transitions DRAFT invoice to ISSUED and sets issued_at', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-draft-1',
            tenant_id: TEST_TENANT_A,
            invoice_number: 'INV-2026-10-0001',
            customer_id: 'cust-1',
            status: 'DRAFT',
            total_amount: 5000000,
            paid_amount: 0,
            currency: 'IDR',
            issued_at: null,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const issued = await issueInvoice(ctx, 'inv-draft-1');

      expect(issued.status).toBe('ISSUED');
      expect(issued.issued_at).toBeDefined();
      expect(typeof issued.issued_at).toBe('string');
      expect(issued.updated_by).toBe(ctx.userId);
    });

    test('3. Issuing non-existent invoice throws INVOICE_NOT_FOUND (404)', async () => {
      const mockDb = createFinancialMockDb({ invoices: [] });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'non-existent')).rejects.toThrowError(FinancialError);
      await expect(issueInvoice(ctx, 'non-existent')).rejects.toThrowError(/INVOICE_NOT_FOUND/);
    });

    test('4. Cross-tenant invoice issuance is rejected (404/FORBIDDEN)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-tenant-b',
            tenant_id: TEST_TENANT_B,
            status: 'DRAFT',
            customer_id: 'cust-1',
            total_amount: 1000000,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'inv-tenant-b')).rejects.toThrowError(/INVOICE_NOT_FOUND/);
    });

    test('5. Issuing an invoice already in ISSUED status throws INVALID_TRANSITION (409)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-already-issued',
            tenant_id: TEST_TENANT_A,
            status: 'ISSUED',
            customer_id: 'cust-1',
            total_amount: 2000000,
            issued_at: '2026-10-07T10:00:00Z',
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'inv-already-issued')).rejects.toThrowError(/INVALID_TRANSITION/);
    });

    test('6. Issuing an invoice in PAID status throws INVALID_TRANSITION (409)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-paid',
            tenant_id: TEST_TENANT_A,
            status: 'PAID',
            customer_id: 'cust-1',
            total_amount: 2000000,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'inv-paid')).rejects.toThrowError(/INVALID_TRANSITION/);
    });

    test('7. Issuing an invoice with null customer_id throws INVALID_INPUT (400)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-no-cust',
            tenant_id: TEST_TENANT_A,
            status: 'DRAFT',
            customer_id: null,
            total_amount: 2000000,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'inv-no-cust')).rejects.toThrowError(/INVALID_INPUT/);
    });

    test('8. Issuing an invoice with zero or negative total_amount throws INVALID_INPUT (400)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-zero-amount',
            tenant_id: TEST_TENANT_A,
            status: 'DRAFT',
            customer_id: 'cust-1',
            total_amount: 0,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(issueInvoice(ctx, 'inv-zero-amount')).rejects.toThrowError(/INVALID_INPUT/);
    });

    test('9. Issuing requires commercial:manage permission', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-1',
            tenant_id: TEST_TENANT_A,
            status: 'DRAFT',
            customer_id: 'cust-1',
            total_amount: 1000000,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const readOnlyCtx = makeContext(TEST_TENANT_A, ['commercial:read']);
      await expect(issueInvoice(readOnlyCtx, 'inv-1')).rejects.toThrowError(/commercial:manage/);
    });

    test('9b. Concurrent invoice issuance fails deterministically due to atomic status=DRAFT predicate', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-concurrent',
            tenant_id: TEST_TENANT_A,
            status: 'DRAFT',
            customer_id: 'cust-1',
            total_amount: 1000000,
          },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      // First request succeeds
      const first = await issueInvoice(ctx, 'inv-concurrent');
      expect(first.status).toBe('ISSUED');

      // Second request (simulating concurrent invocation) fails with INVALID_TRANSITION (409)
      await expect(issueInvoice(ctx, 'inv-concurrent')).rejects.toThrowError(FinancialError);
      await expect(issueInvoice(ctx, 'inv-concurrent')).rejects.toThrowError(/INVALID_TRANSITION/);
    });
  });

  // ==========================================================================
  // SECTION 2: DEDICATED TRANSACTIONAL ALLOCATION RPC & REPOSITORY (D-3.B, D-3.1, D-7.A)
  // ==========================================================================
  describe('Part 2: Transactional Payment Allocation (D-3.B, D-3.1, D-7.A)', () => {
    test('10. Migration 034 creates public.create_payment_allocation RPC function', () => {
      const migPath = path.join(process.cwd(), 'supabase/migrations/20261008_034_create_payment_allocation_rpc.sql');
      expect(fs.existsSync(migPath)).toBe(true);
      const content = fs.readFileSync(migPath, 'utf8');
      expect(content).toContain('CREATE OR REPLACE FUNCTION public.create_payment_allocation');
      expect(content).toContain('SECURITY DEFINER');
      expect(content).toContain('SET search_path = public');
      expect(content).toContain('v_payment.status NOT IN (\'CONFIRMED\', \'COMPLETED\')');
      expect(content).toContain('v_invoice.status NOT IN (\'ISSUED\', \'PARTIAL_PAID\')');
      expect(content).toContain('uq_fin_payment_allocation');
      expect(content).toContain('DUPLICATE_IDEMPOTENCY');
      expect(content).toContain('ALLOCATION_REVERSED');
      expect(content).toContain('is_idempotent');
      expect(content).toContain('GRANT EXECUTE ON FUNCTION public.create_payment_allocation');
    });

    test('11. Direct sequential DB write bypass is sealed: createAllocation calls RPC when available', async () => {
      let rpcCalledWith: any = null;
      const testDb: PaymentDbClient = {
        rpc: async (fn: string, args: Record<string, unknown>) => {
          if (fn === 'create_payment_allocation') {
            rpcCalledWith = args;
            return {
              data: {
                id: 'alloc-rpc-1',
                tenant_id: args.p_tenant_id,
                payment_id: args.p_payment_id,
                invoice_id: args.p_invoice_id,
                amount: args.p_amount,
                currency: args.p_currency,
                status: 'ALLOCATED',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                created_by: args.p_user_id,
                updated_by: args.p_user_id,
              },
              error: null,
            };
          }
          return { data: null, error: { message: `Unknown RPC ${fn}` } };
        },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') {
                    return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  }
                  if (table === 'fin_invoices') {
                    return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 0 }, error: null };
                  }
                  return { data: null, error: null };
                },
                then: (resolve: any) => resolve({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') {
                  return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                }
                if (table === 'fin_invoices') {
                  return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 0 }, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
          insert: () => { throw new Error('Insert should not be called directly when RPC is available'); },
          update: () => { throw new Error('Update should not be called directly when RPC is available'); },
          delete: () => { throw new Error('Delete should not be called'); },
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      const alloc = await createAllocation(ctx, {
        paymentId: 'p1',
        invoiceId: 'i1',
        amount: 250000,
        currency: 'IDR',
      });

      expect(rpcCalledWith).not.toBeNull();
      expect(rpcCalledWith.p_tenant_id).toBe(TEST_TENANT_A);
      expect(rpcCalledWith.p_amount).toBe(250000);
      expect(alloc.id).toBe('alloc-rpc-1');
    });

    test('12. D-7.A: Allocation succeeds with finance:manage permission', async () => {
      const financeCtx = makeContext(TEST_TENANT_A, ['finance:manage']);
      const testDb: PaymentDbClient = {
        rpc: async (fn: string, args: Record<string, unknown>) => ({
          data: { id: 'alloc-1', amount: 100, currency: 'IDR', status: 'ALLOCATED' },
          error: null,
        }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000, paid_amount: 0 }, error: null };
                  return { data: null, error: null };
                },
                then: (res: any) => res({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000, paid_amount: 0 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const alloc = await createAllocation(financeCtx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' });
      expect(alloc.id).toBe('alloc-1');
    });

    test('13. D-7.A: Allocation succeeds with commercial:manage permission', async () => {
      const commCtx = makeContext(TEST_TENANT_A, ['commercial:manage']);
      const testDb: PaymentDbClient = {
        rpc: async (fn: string, args: Record<string, unknown>) => ({
          data: { id: 'alloc-2', amount: 100, currency: 'IDR', status: 'ALLOCATED' },
          error: null,
        }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000, paid_amount: 0 }, error: null };
                  return { data: null, error: null };
                },
                then: (res: any) => res({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000, paid_amount: 0 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const alloc = await createAllocation(commCtx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' });
      expect(alloc.id).toBe('alloc-2');
    });

    test('14. D-7.A: Allocation fails with 403 when lacking both finance:manage and commercial:manage', async () => {
      const readonlyCtx = makeContext(TEST_TENANT_A, ['commercial:read', 'finance:read']);
      await expect(
        createAllocation(readonlyCtx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' }),
      ).rejects.toThrowError(/finance:manage\|commercial:manage/);
    });

    test('15. Allocation rejects payment in PENDING status', async () => {
      const testDb: PaymentDbClient = {
        rpc: async () => ({ data: null, error: null }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'PENDING', currency: 'IDR', amount: 1000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' }),
      ).rejects.toThrowError(/Expected CONFIRMED or COMPLETED/);
    });

    test('16. Allocation rejects invoice in DRAFT status (must be ISSUED or PARTIAL_PAID)', async () => {
      const testDb: PaymentDbClient = {
        rpc: async () => ({ data: null, error: null }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'DRAFT', currency: 'IDR', total_amount: 1000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' }),
      ).rejects.toThrowError(/Expected ISSUED or PARTIAL_PAID/);
    });

    test('17. Allocation rejects currency mismatch between payment, invoice, and request', async () => {
      const testDb: PaymentDbClient = {
        rpc: async () => ({ data: null, error: null }),
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'USD', amount: 1000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 100, currency: 'IDR' }),
      ).rejects.toThrowError(/CURRENCY_MISMATCH/);
    });

    test('17b. RPC duplicate with same amount returns deterministic idempotent success without re-mutation (Case B)', async () => {
      let rpcCallCount = 0;
      const testDb: PaymentDbClient = {
        rpc: async (fn: string, args: Record<string, unknown>) => {
          if (fn === 'create_payment_allocation') {
            rpcCallCount++;
            return {
              data: {
                id: 'alloc-idempotent-1',
                tenant_id: args.p_tenant_id,
                payment_id: args.p_payment_id,
                invoice_id: args.p_invoice_id,
                amount: 500000,
                currency: 'IDR',
                status: 'ALLOCATED',
                is_idempotent: true,
              },
              error: null,
            };
          }
          return { data: null, error: { message: `Unknown RPC ${fn}` } };
        },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 500000 }, error: null };
                  return { data: null, error: null };
                },
                then: (res: any) => res({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 500000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      const res = await createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 500000, currency: 'IDR' });
      expect(res.id).toBe('alloc-idempotent-1');
      expect(res.amount).toBe(500000);
      expect(rpcCallCount).toBe(1);
    });

    test('17c. RPC duplicate with different amount throws DUPLICATE_IDEMPOTENCY (409) (Case C)', async () => {
      const testDb: PaymentDbClient = {
        rpc: async (fn: string) => {
          if (fn === 'create_payment_allocation') {
            return {
              data: null,
              error: {
                message: 'DUPLICATE_IDEMPOTENCY: Active allocation already exists for this payment and invoice with amount 500000, expected 300000',
                code: '23505',
              },
            };
          }
          return { data: null, error: { message: `Unknown RPC ${fn}` } };
        },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000 }, error: null };
                  return { data: null, error: null };
                },
                then: (res: any) => res({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 300000, currency: 'IDR' }),
      ).rejects.toThrowError(PaymentError);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 300000, currency: 'IDR' }),
      ).rejects.toThrowError(/DUPLICATE_IDEMPOTENCY/);
    });

    test('17d. Reallocating a previously REVERSED allocation throws INVALID_STATE (Case D)', async () => {
      const testDb: PaymentDbClient = {
        rpc: async (fn: string) => {
          if (fn === 'create_payment_allocation') {
            return {
              data: null,
              error: {
                message: 'ALLOCATION_REVERSED: Allocation for this payment and invoice was previously REVERSED and cannot be reallocated',
              },
            };
          }
          return { data: null, error: { message: `Unknown RPC ${fn}` } };
        },
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000 }, error: null };
                  return { data: null, error: null };
                },
                then: (res: any) => res({ data: [], error: null }),
              }),
              maybeSingle: async () => {
                if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000 }, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        } as any),
      };
      _setPaymentDbClient(testDb);

      const ctx = makeContext(TEST_TENANT_A);
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 500000, currency: 'IDR' }),
      ).rejects.toThrowError(/ALLOCATION_REVERSED/);
    });

    test('17e. Production runtime forbids direct-write fallback when RPC is unavailable (NODE_ENV !== test)', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        const clientWithoutRpc: any = {
          from: (table: string) => ({
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => {
                    if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                    if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 0 }, error: null };
                    return { data: null, error: null };
                  },
                  then: (res: any) => res({ data: [], error: null }),
                }),
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000, paid_amount: 0 }, error: null };
                  return { data: null, error: null };
                },
              }),
            }),
            insert: () => { throw new Error('Direct write should NEVER happen in production'); },
          }),
        };
        _setPaymentDbClient(clientWithoutRpc);

        const ctx = makeContext(TEST_TENANT_A);
        await expect(
          createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 100000, currency: 'IDR' }),
        ).rejects.toThrowError(/Transactional payment allocation RPC is mandatory in production runtime/);
      } finally {
        (process.env as any).NODE_ENV = prevEnv;
      }
    });

    test('17f. Test-only in-memory fallback respects idempotency when mock DB has no RPC', async () => {
      const existingAllocs = [
        {
          id: 'existing-alloc-1',
          tenant_id: TEST_TENANT_A,
          payment_id: 'p1',
          invoice_id: 'i1',
          amount: 250000,
          currency: 'IDR',
          status: 'ALLOCATED',
        },
      ];

      const clientWithoutRpc: any = {
        from: (table: string) => {
          if (table === 'fin_payment_allocations') {
            return {
              select: () => ({
                eq: (col1: string, val1: any) => ({
                  eq: (col2: string, val2: any) => ({
                    then: (resolve: any) => resolve({ data: existingAllocs, error: null }),
                  }),
                }),
              }),
              insert: () => { throw new Error('Should not insert duplicate'); },
            };
          }
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'fin_payments') return { data: { id: 'p1', tenant_id: TEST_TENANT_A, status: 'CONFIRMED', currency: 'IDR', amount: 1000000 }, error: null };
                  if (table === 'fin_invoices') return { data: { id: 'i1', tenant_id: TEST_TENANT_A, status: 'ISSUED', currency: 'IDR', total_amount: 1000000 }, error: null };
                  return { data: null, error: null };
                },
              }),
            }),
          };
        },
      };
      _setPaymentDbClient(clientWithoutRpc);

      const ctx = makeContext(TEST_TENANT_A);
      // Same amount returns existing
      const res = await createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 250000, currency: 'IDR' });
      expect(res.id).toBe('existing-alloc-1');

      // Different amount throws DUPLICATE_IDEMPOTENCY
      await expect(
        createAllocation(ctx, { paymentId: 'p1', invoiceId: 'i1', amount: 300000, currency: 'IDR' }),
      ).rejects.toThrowError(/DUPLICATE_IDEMPOTENCY/);
    });
  });

  // ==========================================================================
  // SECTION 3: CANONICAL AR READ MODEL & RECONCILIATION (D-4, D-5, D-6, H-1)
  // ==========================================================================
  describe('Part 3: Canonical AR Read Model (D-4, D-5, D-6, H-1)', () => {
    test('18. AR outstanding query excludes DRAFT, CANCELLED, and PAID invoices', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          { id: 'inv-draft', tenant_id: TEST_TENANT_A, status: 'DRAFT', total_amount: 1000, currency: 'IDR' },
          { id: 'inv-cancelled', tenant_id: TEST_TENANT_A, status: 'CANCELLED', total_amount: 2000, currency: 'IDR' },
          { id: 'inv-paid', tenant_id: TEST_TENANT_A, status: 'PAID', total_amount: 3000, paid_amount: 3000, currency: 'IDR' },
          { id: 'inv-issued', tenant_id: TEST_TENANT_A, invoice_number: 'INV-1', status: 'ISSUED', total_amount: 5000, paid_amount: 0, currency: 'IDR' },
        ],
        allocations: [],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const report = await getArOutstanding(ctx);

      expect(report.totalInvoicesCount).toBe(1);
      expect(report.invoices[0].invoiceId).toBe('inv-issued');
      expect(report.totalOutstandingBalance).toBe(5000);
    });

    test('19. AR outstanding balance is computed from authoritative allocations (ALLOCATED and SETTLED only)', async () => {
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-partial',
            tenant_id: TEST_TENANT_A,
            invoice_number: 'INV-PARTIAL',
            status: 'PARTIAL_PAID',
            total_amount: 10000000,
            paid_amount: 4000000, // Header has 4M
            currency: 'IDR',
          },
        ],
        allocations: [
          { id: 'a1', tenant_id: TEST_TENANT_A, invoice_id: 'inv-partial', amount: 2000000, status: 'ALLOCATED' },
          { id: 'a2', tenant_id: TEST_TENANT_A, invoice_id: 'inv-partial', amount: 2000000, status: 'SETTLED' },
          { id: 'a3', tenant_id: TEST_TENANT_A, invoice_id: 'inv-partial', amount: 500000, status: 'REVERSED' }, // Ignored!
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const report = await getArOutstanding(ctx);

      expect(report.totalInvoicesCount).toBe(1);
      const invItem = report.invoices[0];
      expect(invItem.authoritativeAllocatedAmount).toBe(4000000);
      expect(invItem.authoritativeOutstandingBalance).toBe(6000000);
      expect(report.totalOutstandingBalance).toBe(6000000);
      expect(report.totalAllocatedAmount).toBe(4000000);
    });

    test('20. Reconciliation delta is computed and observable without altering AR balance (D-4)', async () => {
      // Header has drift (e.g. 5M cached vs 4M authoritative allocations)
      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-drift',
            tenant_id: TEST_TENANT_A,
            invoice_number: 'INV-DRIFT',
            status: 'PARTIAL_PAID',
            total_amount: 10000000,
            paid_amount: 5000000, // Drift!
            currency: 'IDR',
          },
        ],
        allocations: [
          { id: 'a1', tenant_id: TEST_TENANT_A, invoice_id: 'inv-drift', amount: 4000000, status: 'ALLOCATED' },
        ],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const report = await getArOutstanding(ctx);

      const item = report.invoices[0];
      expect(item.paidAmountHeader).toBe(5000000);
      expect(item.authoritativeAllocatedAmount).toBe(4000000);
      expect(item.reconciliationDelta).toBe(1000000); // 5M - 4M = +1M delta
      // Authoritative outstanding balance uses authoritative allocations, NOT header:
      expect(item.authoritativeOutstandingBalance).toBe(6000000); // 10M - 4M
    });

    test('21. Overdue calculation accurately flags past due dates', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 * 5).toISOString().slice(0, 10);
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000 * 10).toISOString().slice(0, 10);

      const mockDb = createFinancialMockDb({
        invoices: [
          {
            id: 'inv-overdue',
            tenant_id: TEST_TENANT_A,
            invoice_number: 'INV-OVERDUE',
            status: 'ISSUED',
            total_amount: 3000000,
            paid_amount: 0,
            due_date: yesterday,
            currency: 'IDR',
          },
          {
            id: 'inv-current',
            tenant_id: TEST_TENANT_A,
            invoice_number: 'INV-CURRENT',
            status: 'ISSUED',
            total_amount: 2000000,
            paid_amount: 0,
            due_date: future,
            currency: 'IDR',
          },
        ],
        allocations: [],
      });
      _setFinancialDbClient(mockDb);

      const ctx = makeContext(TEST_TENANT_A);
      const report = await getArOutstanding(ctx);

      expect(report.totalOutstandingBalance).toBe(5000000);
      expect(report.totalOverdueBalance).toBe(3000000);

      const overdueItem = report.invoices.find((i) => i.invoiceId === 'inv-overdue')!;
      expect(overdueItem.isOverdue).toBe(true);
      expect(overdueItem.overdueDays).toBeGreaterThanOrEqual(4);

      const currentItem = report.invoices.find((i) => i.invoiceId === 'inv-current')!;
      expect(currentItem.isOverdue).toBe(false);
      expect(currentItem.overdueDays).toBe(0);
    });
  });
});
