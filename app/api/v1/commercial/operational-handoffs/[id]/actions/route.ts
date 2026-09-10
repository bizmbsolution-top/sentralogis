import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { performOperationalHandoffAction } from '@/lib/operational-handoff/service';
import { OperationalHandoffActionInput, OperationalHandoffAction } from '@/lib/operational-handoff/types';
import { toOperationalHandoffErrorResponse } from '@/lib/operational-handoff/http';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveSessionIdentity();
    const body = await request.json();

    const input: OperationalHandoffActionInput = {
      action: body.action as OperationalHandoffAction,
      assignedDomainReference: body.assignedDomainReference ?? undefined,
      failureCode: body.failureCode ?? undefined,
      failureReason: body.failureReason ?? undefined,
    };

    if (!input.action) {
      return NextResponse.json(
        { success: false, error: 'BAD_REQUEST', message: 'action is required.' },
        { status: 400 },
      );
    }

    const { id } = await params;
    const updated = await performOperationalHandoffAction(context, id, input);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return toOperationalHandoffErrorResponse(error);
  }
}
