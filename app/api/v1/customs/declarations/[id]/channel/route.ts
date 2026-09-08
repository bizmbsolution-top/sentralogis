import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CustomsChannelType } from '@/lib/domain/customs/types';

const service = new CustomsService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getDeclaration(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: {
        declaration_id: id,
        channel: aggregate.declaration.channel,
        status: aggregate.declaration.status
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const { channel } = body;
    if (!channel) {
      return NextResponse.json({ success: false, error: 'Missing channel in request body' }, { status: 400 });
    }

    await service.assignChannel(id, auth.tenantId, channel as CustomsChannelType);
    const updated = await service.getDeclaration(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return POST(req, { params });
}
