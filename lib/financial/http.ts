/**
 * Sentralogis — Phase 5D-2 / U-25
 * lib/financial/http.ts
 *
 * Error mapping to stable HTTP responses for the FIN-INVOICE API boundary.
 *
 * Routes stay thin. Every error type from the identity (U-01/U-02) and
 * Financial (U-25) layers maps to exactly one status/error-code pair.
 *
 * No financial mutation logic lives here.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { FinancialError } from './types';

export function toFinancialErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof FinancialError) {
    const code =
      error.code === 'DUPLICATE_IDEMPOTENCY' ? 'CONFLICT'
      : error.code === 'BILLABLE_EVENT_NOT_FOUND' || error.code === 'INVOICE_NOT_FOUND' ? 'NOT_FOUND'
      : error.code;
    return NextResponse.json(
      { success: false, error: code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[financial] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}