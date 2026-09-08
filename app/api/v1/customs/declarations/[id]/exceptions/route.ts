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
    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const category = searchParams.get('category') || undefined;

    const exceptions = await service.listDeclarationExceptions(id, auth.tenantId, {
      status,
      severity,
      category
    });

    return NextResponse.json({
      success: true,
      data: exceptions
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
