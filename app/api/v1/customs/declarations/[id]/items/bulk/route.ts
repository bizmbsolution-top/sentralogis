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
    const idempotencyKey = req.headers.get('idempotency-key') || undefined;
    const body = await req.json();

    const result = await service.previewOrCommitBulkImport(
      id,
      auth.tenantId,
      body,
      idempotencyKey,
      auth.userId
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const result = await service.bulkUpdateItems(
      id,
      auth.tenantId,
      body,
      auth.userId
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
