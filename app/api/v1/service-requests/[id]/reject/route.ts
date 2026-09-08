import { NextRequest, NextResponse } from 'next/server';
import { ServiceRequestService } from '@/lib/domain/service-contracts/service-request-service';
import { ServiceContractError } from '@/lib/domain/service-contracts/errors';

const service = new ServiceRequestService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tenant_id, rejection_reason } = body;

    if (!tenant_id || !rejection_reason) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id or rejection_reason' }, { status: 400 });
    }

    const result = await service.rejectRequest(id, tenant_id, rejection_reason);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof ServiceContractError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}
