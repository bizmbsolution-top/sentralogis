import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import {
  findFulfillmentById,
  findFulfillmentCompositionById,
  updatePlannedFulfillment,
  performFulfillmentAction,
  addFulfillmentAllocation,
  updateAllocationProgress,
} from '@/lib/fulfillment/service';
import { UpdateFulfillmentInput, FulfillmentActionInput, AddFulfillmentAllocationInput, UpdateAllocationProgressInput } from '@/lib/fulfillment/types';
import { toErrorResponse } from '@/lib/fulfillment/http';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveSessionIdentity();
    const { id } = await params;
    const composition = await findFulfillmentCompositionById(context, id);
    return NextResponse.json({ success: true, data: composition });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveSessionIdentity();
    const { id } = await params;
    const body = await request.json();

    const input: UpdateFulfillmentInput = {
      targetFulfillmentDate: body.targetFulfillmentDate ?? undefined,
    };

    const fulfillment = await updatePlannedFulfillment(id, input, context);
    return NextResponse.json({ success: true, data: fulfillment });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveSessionIdentity();
    const { id } = await params;
    const body = await request.json();

    // Determine action type
    if (body.action) {
      // Lifecycle action
      const input: FulfillmentActionInput = {
        action: body.action,
        reason: body.reason,
      };
      const fulfillment = await performFulfillmentAction(id, input, context);
      return NextResponse.json({ success: true, data: fulfillment });
    }

    if (body.capabilityType) {
      // Add allocation
      const input: AddFulfillmentAllocationInput = {
        capabilityType: body.capabilityType,
        capabilityBindingId: body.capabilityBindingId ?? null,
        allocatedQuantity: body.allocatedQuantity,
        shipmentId: body.shipmentId ?? null,
      };
      const allocation = await addFulfillmentAllocation(id, input, context);
      return NextResponse.json({ success: true, data: allocation }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, error: 'BAD_REQUEST', message: 'Provide action or capabilityType.' },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}