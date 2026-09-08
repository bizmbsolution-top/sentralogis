import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { updateAllocationProgress } from '@/lib/fulfillment/service';
import { UpdateAllocationProgressInput } from '@/lib/fulfillment/types';
import { toErrorResponse } from '@/lib/fulfillment/http';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; allocationId: string }> },
) {
  try {
    const context = await resolveSessionIdentity();
    const { allocationId } = await params;
    const body = await request.json();

    const input: UpdateAllocationProgressInput = {
      deliveredQuantity: body.deliveredQuantity,
      status: body.status,
      shipmentId: body.shipmentId ?? null,
    };

    if (input.deliveredQuantity === undefined || input.deliveredQuantity === null) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'deliveredQuantity is required.' },
        { status: 400 },
      );
    }

    const allocation = await updateAllocationProgress(allocationId, input, context);
    return NextResponse.json({ success: true, data: allocation });
  } catch (error) {
    return toErrorResponse(error);
  }
}