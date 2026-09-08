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
    const includeCompleteness = searchParams.get('completeness') === 'true';

    const docs = await service.listDocuments(id, auth.tenantId);

    if (includeCompleteness) {
      const completeness = await service.getDocumentCompletenessReport(id, auth.tenantId);
      return NextResponse.json({
        success: true,
        data: {
          documents: docs,
          completeness
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: docs
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

    const created = await service.attachDocument(id, auth.tenantId, body, auth.userId);

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
