import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { ShipmentGlobalStatus } from '@/lib/domain/shipment/types';

const service = new ShipmentService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getShipment(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: aggregate
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const { status, notes } = body;

    if (status) {
      await service.updateShipmentStatus(id, auth.tenantId, status as ShipmentGlobalStatus, {
        userId: auth.userId,
        notes
      });
    }

    const updated = await service.getShipment(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
