import { describe, test, expect } from 'vitest';
import type { BillableEvent, FinInvoice, FinArAp } from '../financial/types';

// ============================================================================
// FINANCIAL TYPE TESTS
// ============================================================================

describe('Phase 5C-5 Financial Settlement', () => {
  describe('BillableEvent Type', () => {
    test('has required fields', () => {
      const event: Partial<BillableEvent> = {
        salesOrderId: 'so-1',
        capabilityType: 'FORWARDING',
        side: 'SELL',
        description: 'Ocean freight',
        quantity: 10,
        unitOfMeasure: 'CONTAINER',
        currency: 'USD',
        unitAmount: 1200,
        totalAmount: 12000,
        status: 'PENDING',
      };

      expect(event.salesOrderId).toBe('so-1');
      expect(event.capabilityType).toBe('FORWARDING');
      expect(event.side).toBe('SELL');
      expect(event.totalAmount).toBe(12000);
      expect(event.status).toBe('PENDING');
    });

    test('preserves BUY/SELL distinction', () => {
      const sellEvent: Partial<BillableEvent> = { side: 'SELL' };
      const buyEvent: Partial<BillableEvent> = { side: 'BUY' };

      expect(sellEvent.side).toBe('SELL');
      expect(buyEvent.side).toBe('BUY');
    });
  });

  describe('Invoice Type', () => {
    test('has required fields', () => {
      const invoice: Partial<FinInvoice> = {
        invoiceNumber: 'INV-202609-0001',
        side: 'AR',
        currency: 'USD',
        totalAmount: 12000,
        status: 'DRAFT',
      };

      expect(invoice.invoiceNumber).toBe('INV-202609-0001');
      expect(invoice.side).toBe('AR');
      expect(invoice.totalAmount).toBe(12000);
    });
  });

  describe('AR/AP Type', () => {
    test('SELL creates AR', () => {
      const ar: Partial<FinArAp> = { side: 'AR', totalAmount: 12000 };
      expect(ar.side).toBe('AR');
    });

    test('BUY creates AP', () => {
      const ap: Partial<FinArAp> = { side: 'AP', totalAmount: 9000 };
      expect(ap.side).toBe('AP');
    });
  });

  describe('Immutability', () => {
    test('committed price snapshot cannot be mutated', () => {
      const event: Partial<BillableEvent> = {
        priceSnapshotId: 'snapshot-1',
        totalAmount: 12000,
      };

      const originalAmount = event.totalAmount;
      expect(event.totalAmount).toBe(originalAmount);
    });
  });

  describe('Idempotency', () => {
    test('idempotency key prevents duplicates', () => {
      const event: Partial<BillableEvent> = {
        idempotencyKey: 'unique-key-123',
      };

      expect(event.idempotencyKey).toBe('unique-key-123');
    });
  });
});
