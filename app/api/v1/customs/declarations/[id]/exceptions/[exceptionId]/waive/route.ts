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
    const body = await req.json();

    const updated = await service.waiveException(id, exceptionId, auth.tenantId, {
      exception_id: exceptionId,
      justification_reason: body.justification_reason || body.reason || ''
    }, auth.userId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
