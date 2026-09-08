import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { CustomsDeclarationRepository } from '@/lib/domain/customs/declaration-repository';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();
const repo = new CustomsDeclarationRepository();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const aggregate = await repo.getDeclarationAggregate(id, auth.tenantId);
    const line = body.line || aggregate.classification_lines.find(l => l.id === body.line_id);

    if (!line) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Target classification line not found'
          }
        },
        { status: 404 }
      );
    }

    const result = await service.getClassificationCandidates(
      auth.tenantId,
      aggregate.declaration.importer_id,
      line
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
