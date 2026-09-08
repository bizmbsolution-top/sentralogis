import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    if (!body.line_id || !body.hs_code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'line_id and hs_code are required'
          }
        },
        { status: 400 }
      );
    }

    const result = await service.approveLineClassification(
      id,
      auth.tenantId,
      body.line_id,
      {
        hs_code: body.hs_code,
        justification: body.justification,
        update_sku_memory: body.update_sku_memory
      },
      auth.userId,
      auth.userId ? 'PPJK Specialist' : undefined
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
