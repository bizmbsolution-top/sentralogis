import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CreateClassificationLineDTO } from '@/lib/domain/customs/types';

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
      data: aggregate.classification_lines,
      summary: aggregate.summary
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
    const body = await req.json();

    const lines: CreateClassificationLineDTO[] = Array.isArray(body.lines) ? body.lines : [body];
    const created = await service.addClassificationLines(id, auth.tenantId, lines, body.exchange_rate_idr);

    return NextResponse.json(
      {
        success: true,
        data: created
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
