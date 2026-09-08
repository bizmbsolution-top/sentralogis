import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const result = await service.validateDeclarationDetailed(id, auth.tenantId, {
      triggerType: 'MANUAL',
      userId: auth.userId
    });

    return NextResponse.json({
      success: true,
      data: result
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

    const result = await service.validateDeclarationDetailed(id, auth.tenantId, {
      triggerType: body.triggerType || 'MANUAL',
      userId: auth.userId
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
