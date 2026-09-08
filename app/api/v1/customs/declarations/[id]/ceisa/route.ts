import { NextRequest, NextResponse } from 'next/server';
import { CeisaPreparationService } from '@/lib/domain/customs/ceisa/ceisa-preparation-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CeisaArtifactFormat } from '@/lib/domain/customs/ceisa/types';

const ceisaService = new CeisaPreparationService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'XML') as CeisaArtifactFormat;

    const summary = await ceisaService.getLatestPreparation(id, auth.tenantId, format);

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
