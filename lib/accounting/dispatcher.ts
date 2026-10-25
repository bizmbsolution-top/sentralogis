/**
 * Sentralogis — ERP Outbox Dispatcher
 * lib/accounting/dispatcher.ts
 *
 * Implements the ratified D2 / D3 / D4 / D5 domain contracts (ADR-064 / ADR-069):
 * - Server-side asynchronous outbox dispatcher.
 * - Tenant-scoped: bound to IdentityContext.tenantId (no cross-tenant leakage).
 * - Processes ONLY 'VALIDATED' accounting events.
 * - Idempotency: deterministic provider key (${event.id}:${adapter.providerCode}).
 * - Preserves semantic boundaries:
 *     VALIDATED -> DISPATCHED -> ACKNOWLEDGED
 *     DISPATCHED -> REJECTED
 *     DISPATCHED -> FAILED
 * - AMBIGUOUS is strictly an operational reconciliation outcome; the database status
 *   remains 'DISPATCHED' (the last confirmed state) and records the operational ambiguity.
 * - Zero real ERP network access, zero live credentials.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import type {
  AccountingEvent,
  AccountingEventLine,
  DispatchResult,
  ErpProviderAdapter,
  OutboxDispatchSummary,
} from './types';
import {
  getPendingValidatedEvents,
  getAccountingEventLines,
  getAccountingEventById,
  markEventDispatched,
  markEventAcknowledged,
  markEventRejected,
  markEventFailed,
  markEventAmbiguous,
} from './repository';
import { AccountingError } from './types';

export interface DispatchOptions {
  limit?: number;
  overrideClient?: unknown;
}

export class OutboxDispatcher {
  /**
   * Generates a deterministic provider idempotency key for an accounting event.
   * Ratified D3 Invariant: Stable Accounting Event ID + Deterministic Provider Key.
   */
  public static generateProviderKey(event: AccountingEvent, providerCode: string): string {
    return `${event.id}:${providerCode}`;
  }

  /**
   * Dispatches a single VALIDATED accounting event through an injected provider adapter.
   */
  public static async dispatchEvent(
    ctx: IdentityContext,
    eventId: string,
    adapter: ErpProviderAdapter,
    options?: { overrideClient?: unknown }
  ): Promise<DispatchResult> {
    assertPermission(ctx, 'commercial:manage');

    const event = await getAccountingEventById(ctx, eventId);
    if (!event) {
      throw new AccountingError('ACCOUNTING_EVENT_NOT_FOUND', 404, `Accounting event ${eventId} not found`);
    }

    if (event.tenantId !== ctx.tenantId) {
      throw new AccountingError('ACCOUNTING_EVENT_NOT_OWNED', 403, 'Event does not belong to caller tenant');
    }

    if (event.status !== 'VALIDATED') {
      throw new AccountingError(
        'INVALID_TRANSITION',
        400,
        `Cannot dispatch event with status '${event.status}'. Only 'VALIDATED' events may be dispatched.`
      );
    }

    return this.processSingleEvent(ctx, event, adapter, options?.overrideClient);
  }

  /**
   * Dispatches pending VALIDATED accounting events for the authenticated tenant.
   */
  public static async dispatchPendingEvents(
    ctx: IdentityContext,
    adapter: ErpProviderAdapter,
    options?: DispatchOptions
  ): Promise<OutboxDispatchSummary> {
    assertPermission(ctx, 'commercial:manage');

    const limit = Math.max(1, Math.min(options?.limit ?? 50, 500));
    const events = await getPendingValidatedEvents(ctx, limit, options?.overrideClient);

    const summary: OutboxDispatchSummary = {
      totalProcessed: events.length,
      acknowledgedCount: 0,
      rejectedCount: 0,
      transientFailureCount: 0,
      ambiguousCount: 0,
      results: [],
    };

    for (const event of events) {
      const result = await this.processSingleEvent(ctx, event, adapter, options?.overrideClient);

      summary.results.push({
        eventId: event.id,
        result,
      });

      switch (result.category) {
        case 'ACKNOWLEDGED':
          summary.acknowledgedCount += 1;
          break;
        case 'REJECTED':
          summary.rejectedCount += 1;
          break;
        case 'TRANSIENT_FAILURE':
          summary.transientFailureCount += 1;
          break;
        case 'AMBIGUOUS':
          summary.ambiguousCount += 1;
          break;
      }
    }

    return summary;
  }

  /**
   * Internal processing of a single event through the adapter and database state transitions.
   */
  private static async processSingleEvent(
    ctx: IdentityContext,
    event: AccountingEvent,
    adapter: ErpProviderAdapter,
    client?: unknown
  ): Promise<DispatchResult> {
    // 1. Fetch lines for double-entry representation
    const lines = await getAccountingEventLines(ctx, event.id, client);

    // 2. Mark event as DISPATCHED in database
    await markEventDispatched(ctx, event.id, adapter.providerCode, client);

    // 3. Generate deterministic provider idempotency key
    const providerKey = this.generateProviderKey(event, adapter.providerCode);

    // 4. Invoke provider adapter
    let result: DispatchResult;
    try {
      result = await adapter.dispatch(event, lines, { idempotencyKey: providerKey });
    } catch (err: unknown) {
      // Unhandled runtime/adapter throw is treated as AMBIGUOUS outcome
      // (requires reconciliation; never assume acknowledged or non-retryable)
      const errorMsg = err instanceof Error ? err.message : String(err);
      result = {
        category: 'AMBIGUOUS',
        failureReason: `Adapter execution exception: ${errorMsg}`,
        isRetryable: false,
      };
    }

    // 5. Update database state according to deterministic response classification
    switch (result.category) {
      case 'ACKNOWLEDGED': {
        const corrId = result.externalCorrelationId ?? result.voucherNumber ?? null;
        await markEventAcknowledged(ctx, event.id, corrId, adapter.providerCode, client);
        break;
      }

      case 'REJECTED': {
        const reason = result.failureReason ?? 'ERP provider definitive rejection';
        await markEventRejected(ctx, event.id, reason, client);
        break;
      }

      case 'TRANSIENT_FAILURE': {
        const reason = result.failureReason ?? 'ERP provider transient failure';
        await markEventFailed(ctx, event.id, reason, client);
        break;
      }

      case 'AMBIGUOUS': {
        // Preserves last confirmed state ('DISPATCHED') and records ambiguity
        const reason = result.failureReason ?? 'Indeterminate provider outcome';
        await markEventAmbiguous(ctx, event.id, reason, client);
        break;
      }
    }

    return result;
  }
}
