import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { createFulfillment, findFulfillmentById, findFulfillmentCompositionById, listFulfillmentsBySalesOrder } from '@/lib/fulfillment/service';
import { CreateFulfillmentInput } from '@/lib/fulfillment/types';
import { toErrorResponse } from '@/lib/fulfillment/http';

export async function GET(request: NextRequest) {
  try {
    const context = await resolveSessionIdentity();
    const { searchParams } = new URL(request.url);
    const salesOrderId = searchParams.get('salesOrderId');
    const fulfillmentId = searchParams.get('id');

    if (fulfillmentId) {
      const composition = await findFulfillmentCompositionById(context, fulfillmentId);
      return NextResponse.json({ success: true, data: composition });
    }

    if (salesOrderId) {
      const fulfillments = await listFulfillmentsBySalesOrder(context, salesOrderId);
      return NextResponse.json({ success: true, data: fulfillments });
    }

    return NextResponse.json(
      { success: false, error: 'BAD_REQUEST', message: 'Provide id or salesOrderId query parameter.' },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await resolveSessionIdentity();
    const body = await request.json();

    const input: CreateFulfillmentInput = {
      salesOrderId: body.salesOrderId,
      idempotencyKey: body.idempotencyKey ?? null,
      targetFulfillmentDate: body.targetFulfillmentDate ?? null,
      allocations: body.allocations ?? undefined,
    };

    if (!input.salesOrderId) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'salesOrderId is required.' },
        { status: 400 },
      );
    }

    const result = await createFulfillment(input, context);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}