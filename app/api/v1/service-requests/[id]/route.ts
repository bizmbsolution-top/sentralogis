import { NextRequest, NextResponse } from 'next/server';
import { ServiceRequestService } from '@/lib/domain/service-contracts/service-request-service';
import { ServiceContractError } from '@/lib/domain/service-contracts/errors';

const service = new ServiceRequestService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ success: false, error: 'tenant_id query param is required' }, { status: 400 });
    }

    const request = await service.getRequestById(id, tenant_id);
    return NextResponse.json({ success: true, data: request });
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
