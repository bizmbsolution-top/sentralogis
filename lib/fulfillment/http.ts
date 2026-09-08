/**
 * Sentralogis — Phase 4B / U-15
 * lib/fulfillment/http.ts
 *
 * Error mapping to stable HTTP responses. Routes stay thin; every error type
 * from the identity (U-01/U-02) and Fulfillment (U-15) layers maps to exactly
 * one status/error-code pair.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { FulfillmentError } from './types';

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof FulfillmentError) {
    const code =
      error.code === 'UNIQUE_VIOLATION' ? 'CONFLICT'
      : error.code === 'SALES_ORDER_NOT_FOUND' || error.code === 'FULFILLMENT_NOT_FOUND' || error.code === 'FULFILLMENT_ALLOCATION_NOT_FOUND'
        || error.code === 'CAPABILITY_BINDING_NOT_FOUND' || error.code === 'SHIPMENT_NOT_FOUND' ? 'NOT_FOUND'
      : error.code === 'INVALID_CAPABILITY_TYPE' ? 'BAD_REQUEST'
      : error.code === 'INVALID_STATUS_TRANSITION' || error.code === 'NOT_EDITABLE' || error.code === 'NOT_IN_PLANNED_STATE'
        ? 'UNPROCESSABLE_ENTITY'
      : error.code === 'SALES_ORDER_NOT_CONFIRMED' ? 'UNPROCESSABLE_ENTITY'
      : error.code === 'DATABASE_ERROR' ? 'BAD_REQUEST'
      : error.code;

    return NextResponse.json(
      { success: false, error: code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[fulfillment] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}