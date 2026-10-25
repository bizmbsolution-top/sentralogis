/**
 * Sentralogis — Phase 3 / Unit 1
 * API Route: /api/v1/operational/work-orders/[id]
 *
 * GET — canonical read-only Work Order execution view (WO header + items + JOs).
 *
 * Auth: resolveSessionIdentity (U-01) → assertPermission('commercial:read') (U-02)
 * Tenant: server-derived from IdentityContext, never from client input.
 * Read-only: NO mutations, NO writes, NO RLS changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { getWorkOrderExecutionView } from '@/lib/work-order/service';
import { toWorkOrderErrorResponse } from '@/lib/work-order/http';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity();
    const { id } = await params;
    const view = await getWorkOrderExecutionView(ctx, id);
    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    return toWorkOrderErrorResponse(error);
  }
}
