import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new CustomsService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getDeclaration(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        declaration_id: id,
        sppb_number: aggregate.declaration.sppb_number,
        sppb_date: aggregate.declaration.sppb_date,
        is_released: aggregate.summary.is_released,
        status: aggregate.declaration.status
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await service.issueSppb(id, auth.tenantId, body.sppb_number, body.sppb_date);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
