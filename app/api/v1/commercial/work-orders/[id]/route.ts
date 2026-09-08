/**
 * Sentralogis — Phase 4B-2 / U-04
 * API Route: /api/v1/commercial/work-orders/[id]
 *
 * GET single canonical Commercial Work Order — tenant-scoped, read-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { getWorkOrder, toErrorResponse } from '@/lib/application/commercial-work-orders';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity();
    const { id } = await params;
    const workOrder = await getWorkOrder(ctx, id);

    return NextResponse.json({ success: true, data: workOrder });
  } catch (error) {
    return toErrorResponse(error);
  }
}
