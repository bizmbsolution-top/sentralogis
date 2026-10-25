/**
 * Sentralogis Copilot V2 — Read Gateway HTTP Response Error Helper
 * lib/copilot/read/http-response.ts
 *
 * Maps domain and gateway errors to standard Next.js JSON responses.
 * Kept outside of route handler files to comply with Next.js App Router exports contract.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { ReadGatewayError } from '@/lib/copilot/read/read-gateway-service';
import { SalesOrderError } from '@/lib/sales-order/types';
import { FulfillmentError } from '@/lib/fulfillment/types';
import { ShipmentDomainError } from '@/lib/domain/shipment/errors';
import { WorkOrderReadError } from '@/lib/work-order/types';
import { FinancialError } from '@/lib/financial/types';

export function toReadGatewayErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ReadGatewayError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof SalesOrderError) {
    const isNotFound = error.code === 'SALES_ORDER_NOT_FOUND' || error.statusCode === 404;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'NOT_FOUND' : error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof FulfillmentError) {
    const isNotFound = error.code === 'FULFILLMENT_NOT_FOUND' || error.statusCode === 404;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'NOT_FOUND' : error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ShipmentDomainError) {
    const isNotFound = error.code === 'NOT_FOUND' || error.statusCode === 404;
    return NextResponse.json(
      { success: false, error: isNotFound ? 'NOT_FOUND' : error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof WorkOrderReadError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof FinancialError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[Copilot Read Gateway API Error]:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'An internal error occurred in the Read Gateway.' },
    { status: 500 },
  );
}
