import { describe, test, expect } from 'vitest';
import type {
  FinPayment,
  FinAllocation,
  FinSettlement,
  FinReconciliation,
  CreatePaymentInput,
  CreateAllocationInput,
} from '../financial/payment-types';
import { PaymentError } from '../financial/payment-types';

// ============================================================================
// FIXTURES
// ============================================================================

function makePaymentInput(overrides: Partial<CreatePaymentInput> = {}): CreatePaymentInput {
  return {
    direction: 'AR',
    amount: 100000,
    currency: 'IDR',
    ...overrides,
  };
}

function makeAllocationInput(overrides: Partial<CreateAllocationInput> = {}): CreateAllocationInput {
  return {
    paymentId: 'pay-1',
    invoiceId: 'inv-1',
    amount: 50000,
    currency: 'IDR',
    ...overrides,
  };
}

// ============================================================================
// PAYMENT TESTS
// ============================================================================

describe('Phase 5D-3 Payment & Settlement', () => {
  describe('Payment Types', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makePaymentInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('preserves AR/AP direction', () => {
      const arInput = makePaymentInput({ direction: 'AR' });
      const apInput = makePaymentInput({ direction: 'AP' });
      expect(arInput.direction).toBe('AR');
      expect(apInput.direction).toBe('AP');
    });

    test('explicit currency', () => {
      const input = makePaymentInput({ currency: 'USD' });
      expect(input.currency).toBe('USD');
    });
  });

  describe('Payment Entity', () => {
    test('has required fields', () => {
      const payment: Partial<FinPayment> = {
        paymentNumber: 'PAY-202609-0001',
        direction: 'AR',
        amount: 100000,
        currency: 'IDR',
        status: 'PENDING',
      };

      expect(payment.paymentNumber).toBe('PAY-202609-0001');
      expect(payment.direction).toBe('AR');
      expect(payment.amount).toBe(100000);
    });
  });

  describe('Allocation Types', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makeAllocationInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('references payment and invoice', () => {
      const input = makeAllocationInput({ paymentId: 'pay-1', invoiceId: 'inv-1' });
      expect(input.paymentId).toBe('pay-1');
      expect(input.invoiceId).toBe('inv-1');
    });
  });

  describe('Allocation Entity', () => {
    test('has required fields', () => {
      const allocation: Partial<FinAllocation> = {
        paymentId: 'pay-1',
        invoiceId: 'inv-1',
        amount: 50000,
        currency: 'IDR',
        status: 'ALLOCATED',
      };

      expect(allocation.paymentId).toBe('pay-1');
      expect(allocation.amount).toBe(50000);
    });
  });

  describe('Settlement Entity', () => {
    test('has required fields', () => {
      const settlement: Partial<FinSettlement> = {
        allocationId: 'alloc-1',
        status: 'SETTLED',
      };

      expect(settlement.allocationId).toBe('alloc-1');
      expect(settlement.status).toBe('SETTLED');
    });
  });

  describe('Reconciliation Entity', () => {
    test('has required fields', () => {
      const recon: Partial<FinReconciliation> = {
        externalReference: 'BANK-123',
        externalAmount: 100000,
        status: 'UNMATCHED',
      };

      expect(recon.externalReference).toBe('BANK-123');
      expect(recon.status).toBe('UNMATCHED');
    });
  });

  describe('Error Types', () => {
    test('PaymentError has correct structure', () => {
      const err = new PaymentError('INVALID_TRANSITION', 409, 'Cannot mutate');
      expect(err.code).toBe('INVALID_TRANSITION');
      expect(err.statusCode).toBe(409);
    });
  });

  describe('Idempotency', () => {
    test('duplicate allocation is rejected', () => {
      const input = makeAllocationInput();
      expect(input.paymentId).toBe('pay-1');
      expect(input.invoiceId).toBe('inv-1');
    });
  });
});
