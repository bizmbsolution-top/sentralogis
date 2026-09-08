import { NextRequest, NextResponse } from 'next/server';
import { CeisaPreparationService } from '@/lib/domain/customs/ceisa/ceisa-preparation-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CeisaArtifactFormat } from '@/lib/domain/customs/ceisa/types';

const ceisaService = new CeisaPreparationService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const format = (body.format || 'XML') as CeisaArtifactFormat;

    const summary = await ceisaService.prepareAndPersistRun(
      id,
      auth.tenantId,
      format,
      auth.userId
    );

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
