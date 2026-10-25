/**
 * Sentralogis — Phase 3 / Unit 2
 * app/api/v1/operational/work-orders/audit/route.ts
 *
 * Canonical WO mutation audit API endpoint.
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
import { WorkOrderMutationAuditService } from '@/lib/work-order/mutation-audit';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import type { IdentityContext } from '@/lib/application/identity/types';

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Resolve identity from trusted session (U-01)
    const context = await resolveSessionIdentity(null, request);

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const options = {
      targetId: searchParams.get('targetId') ?? undefined,
      targetType: (searchParams.get('targetType') as any) ?? undefined,
      command: searchParams.get('command') ?? undefined,
      actorId: searchParams.get('actorId') ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate: searchParams.get('toDate') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '50', 10),
      offset: parseInt(searchParams.get('offset') ?? '0', 10),
    };

    // 3. Query audit entries
    const result = await WorkOrderMutationAuditService.queryAudit(context, options);

    // 4. Return response
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Internal server error.', statusCode: 500 } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve identity from trusted session (U-01)
    const context = await resolveSessionIdentity(null, request);

    // 2. Parse request body
    const body = await request.json();

    // 3. Validate required fields
    if (!body?.command || !body?.targetId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_FAILED', message: 'command and targetId are required.', statusCode: 400 } },
        { status: 400 },
      );
    }

    // 4. Record audit entry
    const entry = await WorkOrderMutationAuditService.recordAudit(
      context,
      body.command,
      body.targetId,
      body.targetType ?? 'WORK_ORDER',
      body.previousState,
      body.newState,
      body.reason ?? null,
      body.correlationId ?? null,
      body.idempotencyKey ?? null,
    );

    // 5. Return response
    return NextResponse.json({ success: true, auditId: entry.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Internal server error.', statusCode: 500 } },
      { status: 500 },
    );
  }
}