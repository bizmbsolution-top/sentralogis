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

    const lartasReport = await service.getLartasReport(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: lartasReport
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
