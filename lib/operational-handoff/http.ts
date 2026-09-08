/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/http.ts
 *
 * Error mapping to stable HTTP responses for Operational Handoff routes.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { OperationalHandoffError } from './types';

export function toOperationalHandoffErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof OperationalHandoffError) {
    const status =
      error.code === 'HANDOFF_NOT_FOUND' || error.code === 'FULFILLMENT_NOT_FOUND' || error.code === 'ALLOCATION_NOT_FOUND'
        ? 404
      : error.code === 'UNAUTHORIZED' || error.code === 'CROSS_TENANT_REFERENCE'
        ? 403
      : error.code === 'IDEMPOTENCY_CONFLICT'
        ? 409
      : error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'HANDOFF_TERMINAL' || error.code === 'ADAPTER_REJECTED'
        ? 422
      : 400;

    return NextResponse.json(
      { success: false, error: error.code, message: error.message, details: error.details },
      { status },
    );
  }

  console.error('[operational-handoff] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}
