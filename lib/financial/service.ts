/**
 * Sentralogis — Phase 5D-2
 * lib/financial/service.ts
 *
 * Canonical Financial Settlement service (ADR-064).
 *
 * Bridges commercial commitment to financial settlement.
 * Consumes committed commercial truth; does NOT recalculate pricing.
 * Idempotent, immutable, tenant-safe.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import {
  createBillableEvent,
  getBillableEventById,
  listBillableEventsBySO,
  createInvoice,
  getInvoiceById,
  createArAp,
  getArApById,
  createAdjustment,
  assertFinancialMutability,
} from './repository';
import type {
  BillableEvent,
  FinInvoice,
  FinArAp,
  FinAdjustment,
  CreateBillableEventInput,
  CreateInvoiceInput,
  CreateAdjustmentInput,
} from './types';
import { FinancialError } from './types';

export class FinancialService {
  constructor(private readonly ctx: IdentityContext) {}

  async createBillableEvent(input: CreateBillableEventInput): Promise<BillableEvent> {
    return createBillableEvent(this.ctx, input);
  }

  async getBillableEvent(eventId: string): Promise<BillableEvent | null> {
    return getBillableEventById(this.ctx, eventId);
  }

  async listBillableEventsBySO(salesOrderId: string): Promise<BillableEvent[]> {
    return listBillableEventsBySO(this.ctx, salesOrderId);
  }

  async createInvoice(input: CreateInvoiceInput): Promise<{ invoice: FinInvoice }> {
    return createInvoice(this.ctx, input);
  }

  async getInvoice(invoiceId: string): Promise<FinInvoice | null> {
    return getInvoiceById(this.ctx, invoiceId);
  }

  async createArAp(
    invoiceId: string,
    side: 'AR' | 'AP',
    totalAmount: number,
    currency: string,
    dueDate?: string | null,
  ): Promise<FinArAp> {
    return createArAp(this.ctx, invoiceId, side, totalAmount, currency, dueDate);
  }

  async getArAp(arApId: string): Promise<FinArAp | null> {
    return getArApById(this.ctx, arApId);
  }

  async createAdjustment(input: CreateAdjustmentInput): Promise<FinAdjustment> {
    return createAdjustment(this.ctx, input);
  }
}
