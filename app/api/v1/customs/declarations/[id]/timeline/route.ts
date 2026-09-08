import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new CustomsService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getDeclaration(id, auth.tenantId);
    const dec = aggregate.declaration;

    const timeline = [
      {
        stage: 'CREATED',
        label: 'Customs Declaration Created (AJU Generated)',
        timestamp: dec.created_at,
        status: 'COMPLETED'
      },
      {
        stage: 'CLASSIFICATION',
        label: `${aggregate.classification_lines.length} HS Code Line(s) Classified`,
        timestamp: dec.created_at,
        status: aggregate.classification_lines.length > 0 ? 'COMPLETED' : 'PENDING'
      },
      {
        stage: 'TAX_CALCULATION',
        label: `Total Duty & Tax: IDR ${aggregate.summary.total_tax_payable_idr.toLocaleString('id-ID')}`,
        timestamp: dec.updated_at,
        status: aggregate.summary.total_tax_payable_idr > 0 ? 'COMPLETED' : 'PENDING'
      },
      {
        stage: 'CHANNEL_ASSIGNMENT',
        label: dec.channel ? `Customs Channel: ${dec.channel}` : 'Awaiting Channel Assignment',
        timestamp: dec.updated_at,
        status: dec.channel ? 'COMPLETED' : 'PENDING'
      },
      {
        stage: 'RELEASE_SPPB',
        label: dec.sppb_number ? `SPPB Issued (${dec.sppb_number})` : 'Awaiting SPPB Customs Release',
        timestamp: dec.sppb_date ? `${dec.sppb_date}T00:00:00Z` : dec.updated_at,
        status: dec.sppb_number ? 'COMPLETED' : 'PENDING'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        declaration_id: id,
        declaration_number: dec.declaration_number,
        status: dec.status,
        channel: dec.channel,
        timeline
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
