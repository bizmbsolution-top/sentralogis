import { NextRequest, NextResponse } from 'next/server';
import { CeisaPreparationService } from '@/lib/domain/customs/ceisa/ceisa-preparation-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const ceisaService = new CeisaPreparationService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const runs = await ceisaService.listPreparations(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: runs
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
