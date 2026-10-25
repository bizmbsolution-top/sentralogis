/**
 * Sentralogis — Phase 3 / Unit 2
 * app/api/v1/operational/work-orders/mutate/route.ts
 *
 * Canonical WO mutation API endpoint.
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

export async function POST(request: NextRequest) {
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

    // 4. Execute mutation via HTTP layer
    const result = await WorkOrderMutationHttp.handleMutation(context, body);

    // 5. Return response
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