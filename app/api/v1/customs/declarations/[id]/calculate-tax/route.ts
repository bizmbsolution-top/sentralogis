import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { CustomsTaxCalculator } from '@/lib/domain/customs/tax-calculator';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new CustomsService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const aggregate = await service.getDeclaration(id, auth.tenantId);
    const exchangeRate = body.exchange_rate_idr || CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR;

    const calculation = CustomsTaxCalculator.calculateAggregateTax(
      aggregate.classification_lines.map(l => ({
        cif_value_usd: l.cif_value_usd,
        bm_rate_percent: l.bm_rate_percent,
        ppn_rate_percent: l.ppn_rate_percent,
        pph_rate_percent: l.pph_rate_percent
      })),
      exchangeRate
    );

    return NextResponse.json({
      success: true,
      data: {
        declaration_id: id,
        exchange_rate_idr: exchangeRate,
        calculation
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
