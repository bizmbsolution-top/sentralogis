import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CustomsDeclarationStatus } from '@/lib/domain/customs/types';

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
      data: aggregate
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const { status } = body;

    if (status) {
      await service.updateDeclarationStatus(id, auth.tenantId, status as CustomsDeclarationStatus);
    }

    const updated = await service.getDeclaration(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
