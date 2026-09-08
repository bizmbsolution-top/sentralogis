/**
 * Sentralogis — Phase 4B-4 / U-06
 * API Route: PATCH /api/v1/commercial/work-orders/[id]/capabilities/[bindingId]
 *
 * Capability Binding LIFECYCLE surface. Accepts ONLY {"status": <state>} —
 * lifecycle transition, not general-purpose update (mandate §10/§11).
 *
 * Flow: resolveSessionIdentity (U-01) → assertPermission('commercial:manage')
 * (U-02) → registry authority (U-05) → domain state machine → ATOMIC
 * persist + canonical outbox event (migration 016).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  transitionBinding,
  toLifecycleErrorResponse,
} from '@/lib/application/capability-bindings';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bindingId: string }> },
) {
  try {
    const ctx = await resolveSessionIdentity();
    const { id, bindingId } = await params;
    const body = await req.json().catch(() => null);

    const result = await transitionBinding(ctx, id, bindingId, body);

    return NextResponse.json({
      success: true,
      data: result.binding,
      meta: { action: result.action },
    });
  } catch (error) {
    return toLifecycleErrorResponse(error);
  }
}
