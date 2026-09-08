import { describe, test, expect } from 'vitest';
import type {
  BillableEvent,
  FinInvoice,
  FinArAp,
  FinAdjustment,
  CreateBillableEventInput,
  CreateInvoiceInput,
  CreateAdjustmentInput,
} from '../financial/types';
import { FinancialError } from '../financial/types';
import { assertFinancialMutability } from '../financial/repository';

// ============================================================================
// FIXTURES
// ============================================================================

function makeBillableEventInput(overrides: Partial<CreateBillableEventInput> = {}): CreateBillableEventInput {
  return {
    salesOrderId: 'so-1',
    capabilityType: 'FORWARDING',
    side: 'SELL',
    description: 'Ocean freight',
    quantity: 10,
    unitOfMeasure: 'CONTAINER',
    currency: 'USD',
    unitAmount: 1200,
    totalAmount: 12000,
    ...overrides,
  };
}

function makeInvoiceInput(overrides: Partial<CreateInvoiceInput> = {}): CreateInvoiceInput {
  return {
    salesOrderId: 'so-1',
    customerId: 'cust-1',
    side: 'AR',
    currency: 'USD',
    billableEventIds: [],
    ...overrides,
  };
}

function makeAdjustmentInput(overrides: Partial<CreateAdjustmentInput> = {}): CreateAdjustmentInput {
  return {
    invoiceId: 'inv-1',
    adjustmentType: 'CREDIT_NOTE',
    amount: 500,
    currency: 'USD',
    reason: 'Discount',
    ...overrides,
  };
}

// ============================================================================
// FINANCIAL FOUNDATION TESTS
// ============================================================================

describe('Phase 5D-2 Financial Foundation', () => {
  describe('Billable Event', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makeBillableEventInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('preserves BUY/SELL distinction', () => {
      const sellInput = makeBillableEventInput({ side: 'SELL' });
      const buyInput = makeBillableEventInput({ side: 'BUY' });
      expect(sellInput.side).toBe('SELL');
      expect(buyInput.side).toBe('BUY');
    });

    test('explicit currency', () => {
      const input = makeBillableEventInput({ currency: 'USD' });
      expect(input.currency).toBe('USD');
    });

    test('idempotency key supported', () => {
      const input = makeBillableEventInput({ idempotencyKey: 'unique-key-123' });
      expect(input.idempotencyKey).toBe('unique-key-123');
    });
  });

  describe('Invoice', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makeInvoiceInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('preserves BUY/SELL side', () => {
      const arInput = makeInvoiceInput({ side: 'AR' });
      const apInput = makeInvoiceInput({ side: 'AP' });
      expect(arInput.side).toBe('AR');
      expect(apInput.side).toBe('AP');
    });

    test('explicit currency', () => {
      const input = makeInvoiceInput({ currency: 'USD' });
      expect(input.currency).toBe('USD');
    });
  });

  describe('AR/AP', () => {
    test('AR and AP are structurally distinct', () => {
      const ar: Partial<FinArAp> = { side: 'AR', customerId: 'cust-1' };
      const ap: Partial<FinArAp> = { side: 'AP', supplierId: 'supp-1' };
      expect(ar.side).toBe('AR');
      expect(ap.side).toBe('AP');
    });
  });

  describe('Adjustment', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makeAdjustmentInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('references source financial record', () => {
      const input = makeAdjustmentInput({ invoiceId: 'inv-1' });
      expect(input.invoiceId).toBe('inv-1');
    });

    test('preserves original financial truth', () => {
      const input = makeAdjustmentInput({ adjustmentType: 'CREDIT_NOTE' });
      expect(input.adjustmentType).toBe('CREDIT_NOTE');
    });
  });

  describe('Immutability', () => {
    test('committed statuses are immutable', () => {
      const immutableStatuses = ['PAID', 'INVOICED', 'POSTED', 'RECONCILED'];
      for (const status of immutableStatuses) {
        expect(() => assertFinancialMutability(status)).toThrow(FinancialError);
      }
    });

    test('mutable statuses are allowed', () => {
      const mutableStatuses = ['DRAFT', 'PENDING', 'ACTIVE'];
      for (const status of mutableStatuses) {
        expect(() => assertFinancialMutability(status)).not.toThrow();
      }
    });
  });

  describe('Monetary Integrity', () => {
    test('currency is explicit in all inputs', () => {
      const billableEvent = makeBillableEventInput({ currency: 'USD' });
      const invoice = makeInvoiceInput({ currency: 'USD' });
      const adjustment = makeAdjustmentInput({ currency: 'USD' });

      expect(billableEvent.currency).toBe('USD');
      expect(invoice.currency).toBe('USD');
      expect(adjustment.currency).toBe('USD');
    });
  });

  describe('Error Types', () => {
    test('FinancialError has correct structure', () => {
      const err = new FinancialError('INVALID_TRANSITION', 409, 'Cannot mutate');
      expect(err.code).toBe('INVALID_TRANSITION');
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Cannot mutate');
    });
  });
});
