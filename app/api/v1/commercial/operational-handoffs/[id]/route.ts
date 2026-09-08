import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { findOperationalHandoffById } from '@/lib/operational-handoff/service';
import { toOperationalHandoffErrorResponse } from '@/lib/operational-handoff/http';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const context = await resolveSessionIdentity();
    const handoff = await findOperationalHandoffById(context, params.id);
    return NextResponse.json({ success: true, data: handoff });
  } catch (error) {
    return toOperationalHandoffErrorResponse(error);
  }
}
