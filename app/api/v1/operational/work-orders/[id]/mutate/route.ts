/**
 * Sentralogis — Phase 3 / Unit 2
 * app/api/v1/operational/work-orders/[id]/mutate/route.ts
 *
 * Canonical WO mutation API endpoint for individual work orders.
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All mutations include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any mutation.
 * - Cross-tenant access is impossible (tenant filters on every mutation).
 * - Audit trail recorded for every mutation.
 * - Idempotency protected where required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkOrderMutationHttp } from '@/lib/work-order/mutation-http';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import type { IdentityContext } from '@/lib/application/identity/types';

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Resolve identity from trusted session (U-01)
    const context = await resolveSessionIdentity(null, request);

    // 2. Parse request body
    const body = await request.json();

    // 3. Validate required fields
    if (!body?.command) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_FAILED', message: 'command is required.', statusCode: 400 } },
        { status: 400 },
      );
    }

    // 4. Resolve work order ID from params
    const resolvedParams = await params;
    const workOrderId = resolvedParams.id;

    // 5. Validate UUID format
    const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!workOrderId || !UUID_RE.test(workOrderId)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid work order ID.', statusCode: 400 } },
        { status: 400 },
      );
    }

    // 6. Execute mutation via HTTP layer
    const result = await WorkOrderMutationHttp.handleMutation(context, {
      ...body,
      workOrderId,
    });

    // 7. Return response
    if (!result.success) {
      const statusCode = result.error?.statusCode ?? 500;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    if (err?.name === 'IdentityResolutionError' || err?.statusCode === 401 || err?.statusCode === 403) {
      const statusCode = err.statusCode ?? 401;
      return NextResponse.json(
        { success: false, error: { code: err.code ?? 'UNAUTHENTICATED', message: err.message ?? 'Unauthenticated.', statusCode } },
        { status: statusCode },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Internal server error.', statusCode: 500 } },
      { status: 500 },
    );
  }
}