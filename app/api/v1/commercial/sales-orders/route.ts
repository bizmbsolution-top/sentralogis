/**
 * Sentralogis — Phase 4B / U-13
 * API Route: /api/v1/commercial/sales-orders
 *
 * POST — create a canonical Sales Order (customer commercial commitment).
 * GET  — tenant-scoped list of Sales Orders for an Engagement.
 *
 * Thin route — all logic in the application service:
 *   HTTP → resolveSessionIdentity (U-01) → assertPermission (U-02) →
 *   validate engagement/quote ownership → allocate so_number (ADR-035) → insert.
 *
 * No operational execution is started here (ADR-036 fulfillment boundary).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { createSalesOrder, listSalesOrdersForEngagement } from '@/lib/sales-order/service';
import { toErrorResponse } from '@/lib/sales-order/http';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body.' },
        { status: 400 },
      );
    }
    const result = await createSalesOrder(
      {
        engagementId: body.engagementId,
        quoteId: body.quoteId ?? null,
        idempotencyKey: body.idempotencyKey ?? null,
        orderDate: body.orderDate,
        targetFulfillmentDate: body.targetFulfillmentDate ?? null,
        currency: body.currency,
        totalAgreedRevenue: body.totalAgreedRevenue,
        paymentTermsDays: body.paymentTermsDays,
        incoterm: body.incoterm ?? null,
        commercialNotes: body.commercialNotes ?? null,
      },
      ctx,
    );
    return NextResponse.json(
      { success: true, data: result.salesOrder, meta: { created: result.created } },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const engagementId = req.nextUrl.searchParams.get('engagementId');
    if (!engagementId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'engagementId query param is required.' },
        { status: 400 },
      );
    }
    const list = await listSalesOrdersForEngagement(ctx, engagementId);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return toErrorResponse(error);
  }
}
