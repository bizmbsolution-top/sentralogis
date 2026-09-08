import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  createOperationalHandoff,
  listOperationalHandoffsByFulfillment,
} from '@/lib/operational-handoff/service';
import { CreateOperationalHandoffInput, TargetDomain } from '@/lib/operational-handoff/types';
import { toOperationalHandoffErrorResponse } from '@/lib/operational-handoff/http';

export async function GET(request: NextRequest) {
  try {
    const context = await resolveSessionIdentity();
    const { searchParams } = new URL(request.url);
    const fulfillmentId = searchParams.get('fulfillmentId');

    if (!fulfillmentId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'fulfillmentId query parameter is required.' },
        { status: 400 },
      );
    }

    const handoffs = await listOperationalHandoffsByFulfillment(context, fulfillmentId);
    return NextResponse.json({ success: true, data: handoffs });
  } catch (error) {
    return toOperationalHandoffErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveSessionIdentity();
    const body = await request.json();

    const input: CreateOperationalHandoffInput = {
      fulfillmentId: body.fulfillmentId,
      fulfillmentAllocationId: body.fulfillmentAllocationId,
      targetDomain: body.targetDomain as TargetDomain,
      idempotencyKey: body.idempotencyKey ?? null,
      requestPayload: body.requestPayload ?? {},
    };

    if (!input.fulfillmentId || !input.fulfillmentAllocationId || !input.targetDomain) {
      return NextResponse.json(
        {
          success: false,
          error: 'BAD_REQUEST',
          message: 'fulfillmentId, fulfillmentAllocationId, and targetDomain are required.',
        },
        { status: 400 },
      );
    }

    const result = await createOperationalHandoff(context, input);
    return NextResponse.json({ success: true, data: result }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return toOperationalHandoffErrorResponse(error);
  }
}
