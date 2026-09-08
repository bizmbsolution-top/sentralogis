/**
 * Sentralogis — Phase 4B / U-13
 * lib/sales-order/http.ts
 *
 * Error mapping to stable HTTP responses. Routes stay thin; every error type
 * from the identity (U-01/U-02) and Sales Order (U-13) layers maps to exactly
 * one status/error-code pair.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { SalesOrderError } from './types';

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof SalesOrderError) {
    const code =
      error.code === 'UNIQUE_VIOLATION' ? 'CONFLICT'
      : error.code === 'ENGAGEMENT_NOT_FOUND' || error.code === 'QUOTE_NOT_FOUND' || error.code === 'SALES_ORDER_NOT_FOUND' ? 'NOT_FOUND'
      : error.code;
    return NextResponse.json(
      { success: false, error: code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[sales-order] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}
