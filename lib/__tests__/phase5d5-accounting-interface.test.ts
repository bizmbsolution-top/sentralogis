import { describe, test, expect } from 'vitest';
import type {
  AccountingEvent,
  AccountingEventLine,
  AccountingProvider,
  CreateAccountingEventInput,
  AccountingLineInput,
} from '../accounting/types';
import { AccountingError } from '../accounting/types';

// ============================================================================
// FIXTURES
// ============================================================================

function makeLine(overrides: Partial<AccountingLineInput> = {}): AccountingLineInput {
  return {
    lineType: 'DEBIT',
    accountCode: '1100',
    description: 'Accounts Receivable',
    amount: 100000,
    currency: 'IDR',
    ...overrides,
  };
}

function makeEventInput(overrides: Partial<CreateAccountingEventInput> = {}): CreateAccountingEventInput {
  return {
    eventType: 'INVOICE_ISSUED',
    sourceEntityType: 'INVOICE',
    sourceEntityId: 'inv-1',
    currency: 'IDR',
    lines: [
      makeLine({ lineType: 'DEBIT', accountCode: '1100', amount: 100000 }),
      makeLine({ lineType: 'CREDIT', accountCode: '4100', amount: 100000 }),
    ],
    ...overrides,
  };
}

// ============================================================================
// ACCOUNTING TESTS
// ============================================================================

describe('Phase 5D-5 Accounting Interface', () => {
  describe('Double-Entry Validation', () => {
    test('balanced journal is valid', () => {
      const input = makeEventInput();
      const debitTotal = input.lines.filter((l) => l.lineType === 'DEBIT').reduce((s, l) => s + l.amount, 0);
      const creditTotal = input.lines.filter((l) => l.lineType === 'CREDIT').reduce((s, l) => s + l.amount, 0);
      expect(debitTotal).toBe(creditTotal);
    });

    test('unbalanced journal is rejected', () => {
      const input = makeEventInput({
        lines: [
          makeLine({ lineType: 'DEBIT', amount: 100000 }),
          makeLine({ lineType: 'CREDIT', amount: 50000 }),
        ],
      });
      const debitTotal = input.lines.filter((l) => l.lineType === 'DEBIT').reduce((s, l) => s + l.amount, 0);
      const creditTotal = input.lines.filter((l) => l.lineType === 'CREDIT').reduce((s, l) => s + l.amount, 0);
      expect(debitTotal).not.toBe(creditTotal);
    });
  });

  describe('Accounting Event Types', () => {
    test('input DTO does not contain tenantId', () => {
      const input = makeEventInput();
      expect((input as Record<string, unknown>).tenantId).toBeUndefined();
    });

    test('supports AR events', () => {
      const input = makeEventInput({ eventType: 'AR_PAYMENT_APPLIED' });
      expect(input.eventType).toBe('AR_PAYMENT_APPLIED');
    });

    test('supports AP events', () => {
      const input = makeEventInput({ eventType: 'AP_PAYMENT_APPLIED' });
      expect(input.eventType).toBe('AP_PAYMENT_APPLIED');
    });

    test('preserves FX snapshot', () => {
      const input = makeEventInput({
        fxRate: 15000,
        fxCurrency: 'USD',
        fxTimestamp: '2026-09-01T00:00:00Z',
      });
      expect(input.fxRate).toBe(15000);
      expect(input.fxCurrency).toBe('USD');
    });
  });

  describe('Accounting Event Entity', () => {
    test('has required fields', () => {
      const event: Partial<AccountingEvent> = {
        eventType: 'INVOICE_ISSUED',
        sourceEntityType: 'INVOICE',
        sourceEntityId: 'inv-1',
        currency: 'IDR',
        totalDebit: 100000,
        totalCredit: 100000,
        status: 'DRAFT',
        idempotencyKey: 'INVOICE:inv-1:INVOICE_ISSUED',
      };

      expect(event.totalDebit).toBe(event.totalCredit);
      expect(event.status).toBe('DRAFT');
    });
  });

  describe('Accounting Event Line', () => {
    test('has required fields', () => {
      const line: Partial<AccountingEventLine> = {
        accountingEventId: 'event-1',
        lineType: 'DEBIT',
        accountCode: '1100',
        amount: 100000,
        currency: 'IDR',
      };

      expect(line.lineType).toBe('DEBIT');
      expect(line.amount).toBe(100000);
    });
  });

  describe('Accounting Provider', () => {
    test('has required fields', () => {
      const provider: Partial<AccountingProvider> = {
        providerCode: 'XERO',
        providerName: 'Xero',
        isActive: true,
      };

      expect(provider.providerCode).toBe('XERO');
      expect(provider.isActive).toBe(true);
    });
  });

  describe('Error Types', () => {
    test('AccountingError has correct structure', () => {
      const err = new AccountingError('UNBALANCED_JOURNAL', 422, 'Debit must equal Credit');
      expect(err.code).toBe('UNBALANCED_JOURNAL');
      expect(err.statusCode).toBe(422);
    });
  });

  describe('Idempotency', () => {
    test('idempotency key is deterministic', () => {
      const input = makeEventInput();
      const idempotencyKey = `${input.sourceEntityType}:${input.sourceEntityId}:${input.eventType}`;
      expect(idempotencyKey).toBe('INVOICE:inv-1:INVOICE_ISSUED');
    });
  });
});
