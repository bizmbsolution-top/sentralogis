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
import { resolveOrCreateEngagement } from '@/lib/application/engagement/engagement-bridge';
import {
  createSalesOrder,
  confirmSalesOrder,
  listSalesOrdersForTenant,
  listCustomersAndEngagementsForTenant,
  enrichSalesOrdersWithCustomer,
} from '@/lib/sales-order/service';
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

    let engagementId = typeof body.engagementId === 'string' && body.engagementId.trim() ? body.engagementId.trim() : '';
    const customerId = typeof body.customerId === 'string' && body.customerId.trim() ? body.customerId.trim() : '';

    if (!engagementId && customerId) {
      const engResult = await resolveOrCreateEngagement(
        {
          customerId,
          targetFulfillmentDate: body.targetFulfillmentDate ?? null,
          currency: body.currency || 'IDR',
          commercialNotes: body.commercialNotes ?? null,
        },
        ctx,
      );
      engagementId = engResult.engagement.id;
    }

    if (!engagementId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'Customer atau Engagement wajib dipilih sebelum membuat Sales Order.',
        },
        { status: 400 },
      );
    }

    const totalAgreedRevenue =
      body.totalAgreedRevenue !== undefined && body.totalAgreedRevenue !== null
        ? Number(body.totalAgreedRevenue)
        : 0;
    if (!Number.isFinite(totalAgreedRevenue) || totalAgreedRevenue < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'Total nilai kesepakatan (totalAgreedRevenue) harus berupa angka >= 0.',
        },
        { status: 400 },
      );
    }

    const result = await createSalesOrder(
      {
        engagementId,
        quoteId: body.quoteId ?? null,
        idempotencyKey: typeof body.idempotencyKey === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.idempotencyKey.trim()) ? body.idempotencyKey.trim() : null,
        orderDate: body.orderDate,
        targetFulfillmentDate: body.targetFulfillmentDate ?? null,
        currency: body.currency || 'IDR',
        totalAgreedRevenue,
        paymentTermsDays:
          body.paymentTermsDays !== undefined && body.paymentTermsDays !== null
            ? Number(body.paymentTermsDays)
            : 30,
        incoterm: body.incoterm ?? null,
        commercialNotes: body.commercialNotes ?? null,
      },
      ctx,
    );

    let finalSo = result.salesOrder;
    if (body.confirmImmediately === true && finalSo.status === 'DRAFT') {
      finalSo = await confirmSalesOrder(finalSo.id, ctx);
    }

    const [enriched] = await enrichSalesOrdersWithCustomer(ctx, [finalSo]);
    return NextResponse.json(
      { success: true, data: enriched ?? finalSo, meta: { created: result.created } },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const meta = req.nextUrl.searchParams.get('meta');
    if (meta === 'customers') {
      const q = req.nextUrl.searchParams.get('q');
      const lookup = await listCustomersAndEngagementsForTenant(ctx, { search: q || undefined });
      return NextResponse.json({ success: true, data: lookup });
    }

    const engagementId = req.nextUrl.searchParams.get('engagementId');
    const status = req.nextUrl.searchParams.get('status');
    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 100;

    const list = await listSalesOrdersForTenant(ctx, {
      engagementId: engagementId || null,
      status: status || null,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 100,
    });
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return toErrorResponse(error);
  }
}
