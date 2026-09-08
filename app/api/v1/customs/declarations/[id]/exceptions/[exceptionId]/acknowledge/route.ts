import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id, exceptionId } = await params;

    const updated = await service.acknowledgeException(id, exceptionId, auth.tenantId, auth.userId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
