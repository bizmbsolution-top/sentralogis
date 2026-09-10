/**
 * Sentralogis — Phase 4B / U-13
 * API Route: /api/v1/commercial/sales-orders/[id]
 *
 * GET   — fetch a tenant-scoped Sales Order.
 * PATCH — update a DRAFT Sales Order (controlled amendment; ADR-036).
 * POST  — confirm (`{ action: "confirm" }`) or cancel (`{ action: "cancel" }`).
 *
 * Thin route — all logic in the application service (U-01/U-02 authority).
 * Operational composition does NOT begin here (ADR-036 fulfillment boundary).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  findSalesOrderById,
  updateDraftSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
} from '@/lib/sales-order/service';
import { toErrorResponse } from '@/lib/sales-order/http';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await resolveSessionIdentity();
    const { id } = await params;
    const so = await findSalesOrderById(session, id);
    return NextResponse.json({ success: true, data: so });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await resolveSessionIdentity();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'Invalid JSON body.' },
        { status: 400 },
      );
    }
    const so = await updateDraftSalesOrder(
      id,
      {
        targetFulfillmentDate: body.targetFulfillmentDate,
        currency: body.currency,
        totalAgreedRevenue: body.totalAgreedRevenue,
        paymentTermsDays: body.paymentTermsDays,
        incoterm: body.incoterm,
        commercialNotes: body.commercialNotes,
      },
      session,
    );
    return NextResponse.json({ success: true, data: so });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await resolveSessionIdentity();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'confirm') {
      const so = await confirmSalesOrder(id, session);
      return NextResponse.json({ success: true, data: so });
    }
    if (action === 'cancel') {
      const so = await cancelSalesOrder(id, session, body?.reason ?? undefined);
      return NextResponse.json({ success: true, data: so });
    }

    return NextResponse.json(
      { success: false, error: 'BAD_REQUEST', message: 'action must be "confirm" or "cancel".' },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
