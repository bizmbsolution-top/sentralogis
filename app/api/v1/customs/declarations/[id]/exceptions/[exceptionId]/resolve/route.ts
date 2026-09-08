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

    const updated = await service.resolveException(id, exceptionId, auth.tenantId, {
      exception_id: exceptionId,
      resolution_type: body.resolution_type || 'DATA_CORRECTED',
      resolution_note: body.resolution_note,
      override_data: body.override_data
    }, auth.userId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
