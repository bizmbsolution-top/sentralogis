/**
 * Sentralogis — ERP Provider Adapter Contract & Testing Adapter
 * lib/accounting/adapter.ts
 *
 * Implements the ratified D1 / D4 / D5 domain contracts (ADR-064 / ADR-069):
 * - Provider-neutral interface.
 * - Deterministic representation of ACKNOWLEDGED, REJECTED, TRANSIENT_FAILURE, AMBIGUOUS.
 * - Semantic response interpretation (HTTP 2xx does NOT automatically mean ACKNOWLEDGED).
 * - Zero network calls, zero live credentials, zero production side-effects.
 */

import type {
  AccountingEvent,
  AccountingEventLine,
  DispatchResult,
  ErpProviderAdapter,
  ProviderResponseCategory,
} from './types';

// ============================================================================
// SEMANTIC HTTP RESPONSE INTERPRETER (Phase 2 Rule)
// ============================================================================

/**
 * Semantically interprets provider HTTP-like responses according to the
 * ratified Human Architect acknowledgement clarification:
 * - HTTP 2xx alone MUST NOT automatically mean ACKNOWLEDGED.
 * - HTTP 202: submission queued by provider, not posted -> AMBIGUOUS / pending.
 * - HTTP 201: ACKNOWLEDGED only if genuine voucher/transaction ID is present.
 * - HTTP 200: must be semantically inspected for confirmed posting.
 * - HTTP 204: undocumented / no-content -> AMBIGUOUS (cannot assume posted).
 * - HTTP 429, 502, 503, 504: TRANSIENT_FAILURE (retryable).
 * - HTTP 400, 401, 403, 422: REJECTED (non-retryable business/auth rejection).
 * - Timeout / Contradiction: AMBIGUOUS (requires reconciliation, no blind retransmission).
 */
export function interpretProviderHttpResponse(
  httpStatus: number,
  body?: Record<string, unknown> | null,
  options?: { isTimeout?: boolean; contradictory?: boolean }
): DispatchResult {
  if (options?.isTimeout) {
    return {
      category: 'AMBIGUOUS',
      failureReason: 'Provider request timed out; status indeterminate (requires reconciliation)',
      isRetryable: false,
      rawResponse: { httpStatus, timeout: true },
    };
  }

  if (options?.contradictory) {
    return {
      category: 'AMBIGUOUS',
      failureReason: 'Contradictory provider response detected (requires reconciliation)',
      isRetryable: false,
      rawResponse: body,
    };
  }

  // 1. HTTP 202 ACCEPTED (queued, not posted)
  if (httpStatus === 202) {
    return {
      category: 'AMBIGUOUS',
      externalCorrelationId: (body?.jobId as string) || (body?.requestId as string) || null,
      failureReason: 'Provider accepted submission into async processing queue; voucher not yet confirmed',
      isRetryable: false,
      rawResponse: body,
    };
  }

  // 2. HTTP 201 CREATED (requires verified voucher/transaction ID)
  if (httpStatus === 201) {
    const voucherNumber = (body?.voucherNumber as string) || (body?.journalEntryNumber as string) || null;
    const transactionId = (body?.transactionId as string) || null;
    if (voucherNumber || transactionId) {
      return {
        category: 'ACKNOWLEDGED',
        voucherNumber: voucherNumber ?? transactionId,
        externalCorrelationId: transactionId ?? voucherNumber,
        externalSystem: (body?.providerCode as string) ?? null,
        isRetryable: false,
        rawResponse: body,
      };
    }
    // Generic submission/request ID only
    return {
      category: 'AMBIGUOUS',
      externalCorrelationId: (body?.submissionId as string) || (body?.requestId as string) || null,
      failureReason: 'HTTP 201 received but lacked verified voucher/transaction identifier',
      isRetryable: false,
      rawResponse: body,
    };
  }

  // 3. HTTP 200 OK (must inspect payload semantics)
  if (httpStatus === 200) {
    const isPosted = body?.posted === true || body?.status === 'POSTED' || body?.status === 'SUCCESS';
    const voucherNumber = (body?.voucherNumber as string) || (body?.journalId as string) || null;
    if (isPosted && voucherNumber) {
      return {
        category: 'ACKNOWLEDGED',
        voucherNumber,
        externalCorrelationId: (body?.transactionId as string) ?? voucherNumber,
        externalSystem: (body?.providerCode as string) ?? null,
        isRetryable: false,
        rawResponse: body,
      };
    }
    if (body?.status === 'REJECTED' || body?.success === false) {
      return {
        category: 'REJECTED',
        failureReason: (body?.message as string) || (body?.error as string) || 'ERP provider rejected transaction',
        isRetryable: false,
        rawResponse: body,
      };
    }
    return {
      category: 'AMBIGUOUS',
      failureReason: 'HTTP 200 received without confirmed posting status or voucher identifier',
      isRetryable: false,
      rawResponse: body,
    };
  }

  // 4. HTTP 204 NO CONTENT (undocumented outcome)
  if (httpStatus === 204) {
    return {
      category: 'AMBIGUOUS',
      failureReason: 'HTTP 204 No Content outcome is unconfirmed by provider contract',
      isRetryable: false,
      rawResponse: null,
    };
  }

  // 5. Transient Failures (429 Rate Limit, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
  if ([429, 502, 503, 504].includes(httpStatus)) {
    return {
      category: 'TRANSIENT_FAILURE',
      failureReason: `Transient provider error (HTTP ${httpStatus}): ${body?.message || 'Upstream service temporarily unavailable'}`,
      isRetryable: true,
      rawResponse: body,
    };
  }

  // 6. Permanent / Business Rejections (400 Bad Request, 401 Unauthorized, 403 Forbidden, 422 Unprocessable)
  if ([400, 401, 403, 404, 422].includes(httpStatus)) {
    return {
      category: 'REJECTED',
      failureReason: `Permanent provider rejection (HTTP ${httpStatus}): ${body?.message || body?.error || 'Business validation or authentication failed'}`,
      isRetryable: false,
      rawResponse: body,
    };
  }

  // Fallback default
  return {
    category: 'AMBIGUOUS',
    failureReason: `Unhandled provider HTTP status: ${httpStatus}`,
    isRetryable: false,
    rawResponse: body,
  };
}

// ============================================================================
// MOCK ERP PROVIDER ADAPTER (Strictly for Isolated Testing)
// ============================================================================

export type MockDispatchHandler = (
  event: AccountingEvent,
  lines: AccountingEventLine[],
  options?: { idempotencyKey?: string }
) => Promise<DispatchResult> | DispatchResult;

export class MockErpProviderAdapter implements ErpProviderAdapter {
  readonly providerCode: string;
  private handler?: MockDispatchHandler;
  public dispatchLog: Array<{
    eventId: string;
    idempotencyKey?: string;
    timestamp: string;
  }> = [];

  constructor(providerCode: string = 'MOCK_ERP', handler?: MockDispatchHandler) {
    this.providerCode = providerCode;
    this.handler = handler;
  }

  setHandler(handler: MockDispatchHandler): void {
    this.handler = handler;
  }

  async dispatch(
    event: AccountingEvent,
    lines: AccountingEventLine[],
    options?: { idempotencyKey?: string }
  ): Promise<DispatchResult> {
    this.dispatchLog.push({
      eventId: event.id,
      idempotencyKey: options?.idempotencyKey,
      timestamp: new Date().toISOString(),
    });

    if (this.handler) {
      return this.handler(event, lines, options);
    }

    // Default behavior: ACKNOWLEDGED with deterministic mock voucher
    return {
      category: 'ACKNOWLEDGED',
      voucherNumber: `VCH-${event.id.slice(0, 8).toUpperCase()}`,
      externalCorrelationId: `CORR-${event.id.slice(0, 8).toUpperCase()}`,
      externalSystem: this.providerCode,
      isRetryable: false,
    };
  }

  async reconcile(event: AccountingEvent): Promise<DispatchResult> {
    return {
      category: 'AMBIGUOUS',
      failureReason: `Reconciliation requested for event ${event.id}; manual review pending`,
      isRetryable: false,
    };
  }

  // Static Factory Helpers for Tests
  static createAcknowledged(providerCode: string = 'MOCK_ERP', voucher?: string): MockErpProviderAdapter {
    return new MockErpProviderAdapter(providerCode, (event) => ({
      category: 'ACKNOWLEDGED',
      voucherNumber: voucher ?? `VCH-${event.id.slice(0, 8).toUpperCase()}`,
      externalCorrelationId: `EXT-${event.id.slice(0, 8).toUpperCase()}`,
      externalSystem: providerCode,
      isRetryable: false,
    }));
  }

  static createRejected(reason: string, providerCode: string = 'MOCK_ERP'): MockErpProviderAdapter {
    return new MockErpProviderAdapter(providerCode, () => ({
      category: 'REJECTED',
      failureReason: reason,
      isRetryable: false,
    }));
  }

  static createTransientFailure(reason: string, providerCode: string = 'MOCK_ERP'): MockErpProviderAdapter {
    return new MockErpProviderAdapter(providerCode, () => ({
      category: 'TRANSIENT_FAILURE',
      failureReason: reason,
      isRetryable: true,
    }));
  }

  static createAmbiguous(reason: string, providerCode: string = 'MOCK_ERP'): MockErpProviderAdapter {
    return new MockErpProviderAdapter(providerCode, () => ({
      category: 'AMBIGUOUS',
      failureReason: reason,
      isRetryable: false,
    }));
  }
}
