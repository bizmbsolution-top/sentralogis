import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new CustomsService();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id, lineId } = await params;

    await service.deleteClassificationLine(lineId, id, auth.tenantId);

    return NextResponse.json({
      success: true,
      message: `Classification line ${lineId} deleted successfully.`
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
