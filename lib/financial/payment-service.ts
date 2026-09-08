/**
 * Sentralogis — Phase 5D-3
 * lib/financial/payment-service.ts
 *
 * Canonical Payment service (ADR-067/068/069).
 *
 * Orchestrates payment creation, allocation, settlement, and reconciliation.
 * Consumes committed commercial truth; does NOT recalculate pricing.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import {
  createPayment,
  getPaymentById,
  updatePaymentStatus,
  createAllocation,
  listAllocationsByPayment,
  createSettlement,
  createReconciliation,
  matchReconciliation,
} from './payment-repository';
import type {
  FinPayment,
  FinAllocation,
  FinSettlement,
  FinReconciliation,
  CreatePaymentInput,
  CreateAllocationInput,
  CreateSettlementInput,
  CreateReconciliationInput,
} from './payment-types';

export class PaymentService {
  constructor(private readonly ctx: IdentityContext) {}

  async createPayment(input: CreatePaymentInput): Promise<FinPayment> {
    return createPayment(this.ctx, input);
  }

  async getPayment(paymentId: string): Promise<FinPayment | null> {
    return getPaymentById(this.ctx, paymentId);
  }

  async confirmPayment(paymentId: string): Promise<FinPayment> {
    return updatePaymentStatus(this.ctx, paymentId, 'CONFIRMED');
  }

  async createAllocation(input: CreateAllocationInput): Promise<FinAllocation> {
    return createAllocation(this.ctx, input);
  }

  async listAllocations(paymentId: string): Promise<FinAllocation[]> {
    return listAllocationsByPayment(this.ctx, paymentId);
  }

  async createSettlement(input: CreateSettlementInput): Promise<FinSettlement> {
    return createSettlement(this.ctx, input);
  }

  async createReconciliation(input: CreateReconciliationInput): Promise<FinReconciliation> {
    return createReconciliation(this.ctx, input);
  }

  async matchReconciliation(reconciliationId: string, paymentId: string): Promise<FinReconciliation> {
    return matchReconciliation(this.ctx, reconciliationId, paymentId);
  }
}
