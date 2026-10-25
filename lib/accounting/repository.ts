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
// DATABASE CLIENT INJECTION (testability & isolation)
// ============================================================================

let _injectedDbClient: any = null;

export function _setAccountingDbClient(client: any | null): void {
  _injectedDbClient = client;
}

function getClient(overrideClient?: any): any {
  return overrideClient || _injectedDbClient || supabaseAdmin;
}

// ============================================================================
// ROW MAPPERS (PostgreSQL snake_case <-> Domain Entity camelCase)
// ============================================================================

export function mapRowToAccountingEvent(row: Record<string, unknown>): AccountingEvent {
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string) ?? (row.tenantId as string),
    eventType: (row.event_type as any) ?? (row.eventType as any),
    sourceEntityType: (row.source_entity_type as string) ?? (row.sourceEntityType as string),
    sourceEntityId: (row.source_entity_id as string) ?? (row.sourceEntityId as string),
    sourceReference: (row.source_reference as string) ?? (row.sourceReference as string) ?? null,
    accountingDate: (row.accounting_date as string) ?? (row.accountingDate as string),
    currency: (row.currency as string),
    fxRate: row.fx_rate !== undefined && row.fx_rate !== null ? Number(row.fx_rate) : (row.fxRate !== undefined && row.fxRate !== null ? Number(row.fxRate) : null),
    fxCurrency: (row.fx_currency as string) ?? (row.fxCurrency as string) ?? null,
    fxTimestamp: (row.fx_timestamp as string) ?? (row.fxTimestamp as string) ?? null,
    totalDebit: Number(row.total_debit ?? row.totalDebit ?? 0),
    totalCredit: Number(row.total_credit ?? row.totalCredit ?? 0),
    status: (row.status as any),
    idempotencyKey: (row.idempotency_key as string) ?? (row.idempotencyKey as string),
    externalCorrelationId: (row.external_correlation_id as string) ?? (row.externalCorrelationId as string) ?? null,
    externalSystem: (row.external_system as string) ?? (row.externalSystem as string) ?? null,
    acknowledgedAt: (row.acknowledged_at as string) ?? (row.acknowledgedAt as string) ?? null,
    failureReason: (row.failure_reason as string) ?? (row.failureReason as string) ?? null,
    createdAt: (row.created_at as string) ?? (row.createdAt as string),
    updatedAt: (row.updated_at as string) ?? (row.updatedAt as string),
    createdBy: (row.created_by as string) ?? (row.createdBy as string) ?? null,
    updatedBy: (row.updated_by as string) ?? (row.updatedBy as string) ?? null,
  };
}

export function mapRowToAccountingEventLine(row: Record<string, unknown>): AccountingEventLine {
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string) ?? (row.tenantId as string),
    accountingEventId: (row.accounting_event_id as string) ?? (row.accountingEventId as string),
    lineType: (row.line_type as any) ?? (row.lineType as any),
    accountCode: (row.account_code as string) ?? (row.accountCode as string),
    description: (row.description as string) ?? (row.description as string) ?? null,
    amount: Number(row.amount ?? 0),
    currency: (row.currency as string),
    createdAt: (row.created_at as string) ?? (row.createdAt as string),
    updatedAt: (row.updated_at as string) ?? (row.updatedAt as string),
    createdBy: (row.created_by as string) ?? (row.createdBy as string) ?? null,
    updatedBy: (row.updated_by as string) ?? (row.updatedBy as string) ?? null,
  };
}


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

  const { data: event, error: eventError } = await getClient()
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
      const { data: existing } = await getClient()
        .from('accounting_events')
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existing) {
        const { data: existingLines } = await getClient()
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
    const { data: lineData, error: lineError } = await getClient()
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
    lines.push(mapRowToAccountingEventLine(lineData as Record<string, unknown>));
  }

  // Update status to VALIDATED
  const { data: validatedEvent, error: validateError } = await getClient()
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
    event: mapRowToAccountingEvent(validatedEvent),
    lines,
  };
}

export async function getAccountingEventById(
  ctx: IdentityContext,
  eventId: string,
): Promise<AccountingEvent | null> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await getClient()
    .from('accounting_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch accounting event: ${error.message}`);
  }

  return data ? mapRowToAccountingEvent(data) : null;
}

export async function updateAccountingEventStatus(
  ctx: IdentityContext,
  eventId: string,
  status: string,
  failureReason?: string | null,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await getClient()
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

  return mapRowToAccountingEvent(data);
}

// ============================================================================
// ACCOUNTING PROVIDER REPOSITORY
// ============================================================================

export async function createAccountingProvider(
  ctx: IdentityContext,
  input: CreateAccountingProviderInput,
): Promise<AccountingProvider> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await getClient()
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

  const { data, error } = await getClient()
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

export async function getSettlementOutboxEvent(
  ctx: IdentityContext,
  settlementId: string,
): Promise<{ event: AccountingEvent; lines: AccountingEventLine[] } | null> {
  assertPermission(ctx, 'commercial:read');

  const { data: event, error: eventError } = await getClient()
    .from('accounting_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('source_entity_type', 'fin_settlements')
    .eq('source_entity_id', settlementId)
    .maybeSingle();

  if (eventError || !event) {
    return null;
  }

  const { data: lines, error: linesError } = await getClient()
    .from('accounting_event_lines')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('accounting_event_id', event.id)
    .order('created_at', { ascending: true });

  if (linesError) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch event lines: ${linesError.message}`);
  }

  return {
    event: mapRowToAccountingEvent(event),
    lines: (lines ?? []).map(mapRowToAccountingEventLine),
  };
}

// ============================================================================
// OUTBOX DISPATCH REPOSITORY OPERATIONS (ADR-064 / D2-D4)
// ============================================================================

export async function getPendingValidatedEvents(
  ctx: IdentityContext,
  limit: number = 50,
  overrideClient?: any,
): Promise<AccountingEvent[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'VALIDATED')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch pending validated events: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapRowToAccountingEvent);
}

export async function getAccountingEventLines(
  ctx: IdentityContext,
  eventId: string,
  overrideClient?: any,
): Promise<AccountingEventLine[]> {
  assertPermission(ctx, 'commercial:read');

  const { data, error } = await getClient(overrideClient)
    .from('accounting_event_lines')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('accounting_event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to fetch accounting event lines: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map(mapRowToAccountingEventLine);
}

export async function markEventDispatched(
  ctx: IdentityContext,
  eventId: string,
  externalSystem: string,
  overrideClient?: any,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .update({
      status: 'DISPATCHED',
      external_system: externalSystem,
      updated_by: ctx.userId,
    })
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'VALIDATED')
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to mark event as dispatched: ${error.message}`);
  }

  return mapRowToAccountingEvent(data);
}

export async function markEventAcknowledged(
  ctx: IdentityContext,
  eventId: string,
  externalCorrelationId: string | null,
  externalSystem?: string | null,
  overrideClient?: any,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const updatePayload: Record<string, unknown> = {
    status: 'ACKNOWLEDGED',
    acknowledged_at: new Date().toISOString(),
    failure_reason: null,
    updated_by: ctx.userId,
  };
  if (externalCorrelationId !== undefined) {
    updatePayload.external_correlation_id = externalCorrelationId;
  }
  if (externalSystem) {
    updatePayload.external_system = externalSystem;
  }

  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .update(updatePayload)
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to mark event as acknowledged: ${error.message}`);
  }

  return mapRowToAccountingEvent(data);
}

export async function markEventRejected(
  ctx: IdentityContext,
  eventId: string,
  reason: string,
  overrideClient?: any,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .update({
      status: 'REJECTED',
      failure_reason: reason,
      updated_by: ctx.userId,
    })
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to mark event as rejected: ${error.message}`);
  }

  return mapRowToAccountingEvent(data);
}

export async function markEventFailed(
  ctx: IdentityContext,
  eventId: string,
  reason: string,
  overrideClient?: any,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .update({
      status: 'FAILED',
      failure_reason: reason,
      updated_by: ctx.userId,
    })
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to mark event as failed: ${error.message}`);
  }

  return mapRowToAccountingEvent(data);
}

export async function markEventAmbiguous(
  ctx: IdentityContext,
  eventId: string,
  reason: string,
  overrideClient?: any,
): Promise<AccountingEvent> {
  assertPermission(ctx, 'commercial:manage');

  // CRITICAL INVARIANT: AMBIGUOUS is NOT a database status.
  // The database status remains 'DISPATCHED' (the last confirmed state).
  // The failure_reason records the ambiguous outcome for operational reconciliation.
  const { data, error } = await getClient(overrideClient)
    .from('accounting_events')
    .update({
      status: 'DISPATCHED',
      failure_reason: `AMBIGUOUS: ${reason}`,
      updated_by: ctx.userId,
    })
    .eq('id', eventId)
    .eq('tenant_id', ctx.tenantId)
    .select('*')
    .single();

  if (error) {
    throw new AccountingError('DATABASE_ERROR', 400, `Failed to record ambiguous event state: ${error.message}`);
  }

  return mapRowToAccountingEvent(data);
}


