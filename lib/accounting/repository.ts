/**
 * Sentralogis — Phase 5D-5
 * lib/accounting/repository.ts
 *
 * Canonical Accounting repository (ADR-064/069).
 *
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - Double-entry validation before persistence.
 * - Idempotent: duplicate idempotency keys return existing records.
 * - Immutable: posted events cannot be mutated.
 */

import { supabaseAdmin } from '../supabase/admin';
import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type {
  AccountingEvent,
  AccountingEventLine,
  AccountingProvider,
  CreateAccountingEventInput,
  CreateAccountingProviderInput,
} from './types';
import { AccountingError } from './types';

// ============================================================================
// ACCOUNTING EVENT REPOSITORY
// ============================================================================

export async function createAccountingEvent(
  ctx: IdentityContext,
  input: CreateAccountingEventInput,
): Promise<{ event: AccountingEvent; lines: AccountingEventLine[] }> {
  assertPermission(ctx, 'commercial:manage');

  // Validate double-entry balance
  const totalDebit = input.lines
    .filter((l) => l.lineType === 'DEBIT')
    .reduce((sum, l) => sum + l.amount, 0);
  const totalCredit = input.lines
    .filter((l) => l.lineType === 'CREDIT')
    .reduce((sum, l) => sum + l.amount, 0);

  if (totalDebit !== totalCredit) {
    throw new AccountingError(
      'UNBALANCED_JOURNAL',
      422,
      `Debit (${totalDebit}) must equal Credit (${totalCredit})`,
    );
  }

  const idempotencyKey = `${input.sourceEntityType}:${input.sourceEntityId}:${input.eventType}`;

  const { data: event, error: eventError } = await supabaseAdmin
    .from('accounting_events')
    .insert({
      tenant_id: ctx.tenantId,
      event_type: input.eventType,
      source_entity_type: input.sourceEntityType,
      source_entity_id: input.sourceEntityId,
      source_reference: input.sourceReference ?? null,
      accounting_date: input.accountingDate ?? new Date().toISOString().split('T')[0],
      currency: input.currency,
      fx_rate: input.fxRate ?? null,
      fx_currency: input.fxCurrency ?? null,
      fx_timestamp: input.fxTimestamp ?? null,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'DRAFT',
      idempotency_key: idempotencyKey,
      external_system: input.externalSystem ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (eventError) {
    if (eventError.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('accounting_events')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        const { data: existingLines } = await supabaseAdmin
          .from('accounting_event_lines')
          .select('*')
          .eq('tenant_id', ctx.tenantId)
          .eq('accounting_event_id', existing.id);
        return {
          event: existing as unknown as AccountingEvent,
          lines: (existingLines ?? []) as unknown as AccountingEventLine[],
        };
      }
    }
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to create accounting event: ${eventError.message}`);
  }

  const lines: AccountingEventLine[] = [];
  for (const line of input.lines) {
    const { data: lineData, error: lineError } = await supabaseAdmin
      .from('accounting_event_lines')
      .insert({
        tenant_id: ctx.tenantId,
        accounting_event_id: event.id,
        line_type: line.lineType,
        account_code: line.accountCode,
        description: line.description ?? null,
        amount: line.amount,
        currency: line.currency,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })
      .select('*')
      .single();

    if (lineError) {
      throw new AccountingError('DATABASE_ERROR', 400, `Failed to create accounting line: ${lineError.message}`);
    }
    lines.push(lineData as unknown as AccountingEventLine);
  }

  // Update status to VALIDATED
  const { data: validatedEvent, error: validateError } = await supabaseAdmin
    .from('accounting_events')
    .update({ status: 'VALIDATED', updated_by: ctx.userId })
    .eq('id', event.id)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (validateError) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to validate accounting event: ${validateError.message}`);
  }

  return {
    event: validatedEvent as unknown as AccountingEvent,
    lines,
  };
}

export async function getAccountingEventById(
  ctx: IdentityContext,
  eventId: string,
): Promise<AccountingEvent | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await supabaseAdmin
    .from('accounting_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch accounting event: ${error.message}`);
  }

  return data as unknown as AccountingEvent | null;
}

export async function updateAccountingEventStatus(
  ctx: IdentityContext,
  eventId: string,
  status: string,
  failureReason?: string | null,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
    .from('accounting_events')
    .update({
      status,
      failure_reason: failureReason ?? null,
      acknowledged_at: status === 'ACKNOWLEDGED' ? new Date().toISOString() : null,
      updated_by: ctx.userId,
    })
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to update accounting event status: ${error.message}`);
  }

  return data as unknown as AccountingEvent;
}

// ============================================================================
// ACCOUNTING PROVIDER REPOSITORY
// ============================================================================

export async function createAccountingProvider(
  ctx: IdentityContext,
  input: CreateAccountingProviderInput,
): Promise<AccountingProvider> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await supabaseAdmin
    .from('accounting_providers')
    .insert({
      tenant_id: ctx.tenantId,
      provider_code: input.providerCode,
      provider_name: input.providerName,
      config: input.config ?? {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to create accounting provider: ${error.message}`);
  }

  return data as unknown as AccountingProvider;
}

export async function getAccountingProviderByCode(
  ctx: IdentityContext,
  providerCode: string,
): Promise<AccountingProvider | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await supabaseAdmin
    .from('accounting_providers')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('provider_code', providerCode)
    .maybeSingle();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch accounting provider: ${error.message}`);
  }

  return data as unknown as AccountingProvider | null;
}
