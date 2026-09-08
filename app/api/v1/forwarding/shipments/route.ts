import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { CreateShipmentDTO, ShipmentGlobalStatus } from '@/lib/domain/shipment/types';
import { resolveOrCreateEngagement } from '@/lib/application/engagement/engagement-bridge';
import type { IdentityContext } from '@/lib/application/identity/types';

const service = new ShipmentService();

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveApiAuthContext(req);
    const body = await req.json();

    // Build IdentityContext for U-03 engagement resolution
    const ctx: IdentityContext = {
      tenantId: auth.tenantId,
      userId: auth.userId || '',
      membershipId: null,
      role: auth.role || 'API_CONSUMER',
      isTenantOwner: false,
      permissions: ['commercial:manage'],
      sbuScope: null,
    };

    // U-09 REPAIR: Resolve canonical engagement via U-03 when work_order_id is missing.
    // The client MUST NOT fabricate work_order_id or service_scope_id.
    let workOrderId = body.work_order_id;
    let serviceScopeId = body.service_scope_id;

    if (!workOrderId && body.customer_id) {
      const engagement = await resolveOrCreateEngagement(
        { customerId: body.customer_id },
        ctx,
      );
      workOrderId = engagement.engagement.id;
      serviceScopeId = engagement.engagement.serviceScopeId || serviceScopeId;
    }

    // Enforce authenticated tenant context - NEVER trust client body tenant_id
    const dto: CreateShipmentDTO = {
      ...body,
      tenant_id: auth.tenantId,
      work_order_id: workOrderId,
      service_scope_id: serviceScopeId,
      created_by: auth.userId || body.created_by
    };

    const aggregate = await service.createShipment(dto);

    return NextResponse.json(
      {
        success: true,
        data: aggregate
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { searchParams } = new URL(req.url);

    const status = (searchParams.get('status') as ShipmentGlobalStatus) || undefined;
    const work_order_id = searchParams.get('work_order_id') || undefined;
    const customer_id = searchParams.get('customer_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const list = await service.listShipments(auth.tenantId, {
      status,
      work_order_id,
      customer_id,
      limit
    });

    return NextResponse.json({
      success: true,
      data: list,
      meta: {
        total: list.length,
        tenant_id: auth.tenantId
      }
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
