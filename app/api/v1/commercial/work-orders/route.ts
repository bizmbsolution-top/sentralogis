/**
 * Sentralogis — Phase 4B-2 / U-04
 * API Route: /api/v1/commercial/work-orders
 *
 * POST — create/resolve the canonical Commercial Work Order (engagement root).
 * GET  — tenant-scoped, filtered, paginated list.
 *
 * Architecture (thin route — all logic in the application service):
 *   HTTP → resolveSessionIdentity (U-01) → assertPermission (U-02) →
 *   validation → U-03 Engagement Bridge → commercial_work_orders.
 *
 * ADR-018/ADR-032. No service_requests, no capability bindings, no SBU
 * execution is created here (mandate §22–§24).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { createWorkOrder, listWorkOrders, parseListFilters, toErrorResponse } from '@/lib/application/commercial-work-orders';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const body = await req.json().catch(() => null);
    const result = await createWorkOrder(ctx, body);

    return NextResponse.json(
      { success: true, data: result.workOrder, meta: { created: result.created } },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    const filters = parseListFilters(req.nextUrl.searchParams);
    const result = await listWorkOrders(ctx, filters);

    return NextResponse.json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    return toErrorResponse(error);
  }
}
