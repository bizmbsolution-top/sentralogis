import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id, documentId } = await params;
    const body = await req.json();

    const { status, notes } = body;

    const updated = await service.updateDocumentStatus(
      id,
      auth.tenantId,
      documentId,
      status,
      auth.userId,
      notes
    );

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id, documentId } = await params;

    await service.deleteDocument(id, auth.tenantId, documentId);

    return NextResponse.json({
      success: true,
      message: 'Document unlinked successfully'
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
