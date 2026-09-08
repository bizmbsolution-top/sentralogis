import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { ExceptionService } from '@/lib/domain/shipment/exception-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';

const service = new ShipmentService();
const exceptionService = new ExceptionService();

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
      data: aggregate.exceptions
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const { exception_type, severity, description, execution_leg_id } = body;

    if (!exception_type || !severity || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing mandatory fields: exception_type, severity, description' },
        { status: 400 }
      );
    }

    // Verify shipment exists and belongs to tenant
    await service.getShipment(id, auth.tenantId);

    const exception = await exceptionService.logException(
      auth.tenantId,
      id,
      exception_type,
      severity,
      description,
      execution_leg_id
    );

    return NextResponse.json(
      {
        success: true,
        data: exception
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
