/**
 * Sentralogis Copilot V2 — Unified Read Gateway Entity Route
 * app/api/copilot/entity/[type]/[id]/route.ts
 *
 * GET /api/copilot/entity/[type]/[id]
 *
 * Server-side entry point for hydrating canonical domain entity details for Copilot V2.
 *
 * INVARIANTS:
 * 1. Read-only: Zero mutations, zero execution side effects.
 * 2. Identity: Derived strictly from server session via resolveSessionIdentity.
 * 3. Delegation: Hands off to getEntityDetail() in lib/copilot/read/read-gateway-service.ts.
 * 4. Error Handling: Mapped to verified HTTP status codes fail-closed (401, 403, 400, 404, 500).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { getEntityDetail } from '@/lib/copilot/read/read-gateway-service';
import { toReadGatewayErrorResponse } from '@/lib/copilot/read/http-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity(undefined, req);
    const { type, id } = await params;
    const detail = await getEntityDetail(ctx, type, id);
    return NextResponse.json({ success: true, data: detail });
  } catch (error: unknown) {
    return toReadGatewayErrorResponse(error);
  }
}
