import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { ExceptionService } from '@/lib/domain/shipment/exception-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';

const service = new ShipmentService();
const exceptionService = new ExceptionService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id, exceptionId } = await params;

    await service.getShipment(id, auth.tenantId);

    await exceptionService.resolveException(exceptionId, auth.tenantId, id, auth.userId);

    return NextResponse.json({
      success: true,
      message: `Exception ${exceptionId} marked as resolved.`
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
