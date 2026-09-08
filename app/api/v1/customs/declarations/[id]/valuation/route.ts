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
    const rateParam = searchParams.get('rate');
    const exchangeRate = rateParam ? Number(rateParam) : 16000;

    const valuation = await service.getValuationSummary(id, auth.tenantId, exchangeRate);

    return NextResponse.json({
      success: true,
      data: valuation
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
