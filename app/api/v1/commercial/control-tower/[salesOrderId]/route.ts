/**
 * Sentralogis — Phase 4B / U-23
 * API Route: /api/v1/commercial/control-tower/[salesOrderId]
 *
 * GET — Composed read-only control-tower workspace projection for a Sales Order.
 * Supports query param `?view=customer` for sanitized customer-facing view,
 * defaulting to full internal operator workspace.
 *
 * Thin route: All composition in `lib/control-tower/service.ts`.
 * Zero database writes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  getInternalOperatorWorkspace,
  getCustomerWorkspaceProjection,
} from '@/lib/control-tower/service';
import { toErrorResponse } from '@/lib/sales-order/http';

export async function GET(req: NextRequest, { params }: { params: { salesOrderId: string } }) {
  try {
    const session = await resolveSessionIdentity();
    const { salesOrderId } = params;
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (view === 'customer') {
      const projection = await getCustomerWorkspaceProjection(session, salesOrderId);
      return NextResponse.json({ success: true, data: projection });
    }

    const workspace = await getInternalOperatorWorkspace(session, salesOrderId);
    return NextResponse.json({ success: true, data: workspace });
  } catch (error) {
    return toErrorResponse(error);
  }
}
