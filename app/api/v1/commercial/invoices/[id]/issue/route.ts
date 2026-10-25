/**
 * Sentralogis — Phase 5D-2 / R2-C.4N
 * app/api/v1/commercial/invoices/[id]/issue/route.ts
 *
 * API Route: POST /api/v1/commercial/invoices/[id]/issue
 *
 * Transitions a DRAFT invoice to ISSUED status (D-1.A).
 * Sets issued_at = NOW() (D-2.A).
 *
 * Authorization:
 *   assertPermission(ctx, 'commercial:manage')
 *
 * Thin route: delegates all domain logic to issueInvoice(ctx, id).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { issueInvoice } from '@/lib/financial/repository';
import { toFinancialErrorResponse } from '@/lib/financial/http';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity(undefined, req);
    const { id: invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Invoice ID is required.' },
        { status: 400 },
      );
    }

    const invoice = await issueInvoice(ctx, invoiceId);

    return NextResponse.json(
      {
        success: true,
        data: invoice,
      },
      { status: 200 },
    );
  } catch (error) {
    return toFinancialErrorResponse(error);
  }
}
