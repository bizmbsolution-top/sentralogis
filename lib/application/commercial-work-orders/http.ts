/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/http.ts
 *
 * Error mapping to stable HTTP responses. Routes stay thin; every error type
 * from the identity (U-01/U-02), engagement (U-03), and work-order layers
 * maps to exactly one status/error-code pair (mandate §27).
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { EngagementError } from '@/lib/application/engagement/types';
import { WorkOrderError } from './types';

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof EngagementError) {
    const code =
      error.code === 'CUSTOMER_NOT_FOUND' ? 'CUSTOMER_NOT_FOUND'
      : error.code === 'UNIQUE_VIOLATION' ? 'CONFLICT'
      : error.code;
    return NextResponse.json(
      { success: false, error: code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof WorkOrderError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[commercial-work-orders] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}
