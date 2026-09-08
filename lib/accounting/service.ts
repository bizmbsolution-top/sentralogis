/**
 * Sentralogis — Phase 5D-5
 * lib/accounting/service.ts
 *
 * Canonical Accounting service (ADR-064/069).
 *
 * Orchestrates accounting event creation, validation, and dispatch.
 * Consumes financial domain facts; does NOT become authoritative over them.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import {
  createAccountingEvent,
  getAccountingEventById,
  updateAccountingEventStatus,
  createAccountingProvider,
  getAccountingProviderByCode,
} from './repository';
import type {
  AccountingEvent,
  AccountingEventLine,
  AccountingProvider,
  CreateAccountingEventInput,
  CreateAccountingProviderInput,
} from './types';

export class AccountingService {
  constructor(private readonly ctx: IdentityContext) {}

  async createEvent(input: CreateAccountingEventInput): Promise<{ event: AccountingEvent; lines: AccountingEventLine[] }> {
    return createAccountingEvent(this.ctx, input);
  }

  async getEvent(eventId: string): Promise<AccountingEvent | null> {
    return getAccountingEventById(this.ctx, eventId);
  }

  async markDispatched(eventId: string): Promise<AccountingEvent> {
    return updateAccountingEventStatus(this.ctx, eventId, 'DISPATCHED');
  }

  async markAcknowledged(eventId: string): Promise<AccountingEvent> {
    return updateAccountingEventStatus(this.ctx, eventId, 'ACKNOWLEDGED');
  }

  async markRejected(eventId: string, reason: string): Promise<AccountingEvent> {
    return updateAccountingEventStatus(this.ctx, eventId, 'REJECTED', reason);
  }

  async markFailed(eventId: string, reason: string): Promise<AccountingEvent> {
    return updateAccountingEventStatus(this.ctx, eventId, 'FAILED', reason);
  }

  async createProvider(input: CreateAccountingProviderInput): Promise<AccountingProvider> {
    return createAccountingProvider(this.ctx, input);
  }

  async getProvider(providerCode: string): Promise<AccountingProvider | null> {
    return getAccountingProviderByCode(this.ctx, providerCode);
  }
}
