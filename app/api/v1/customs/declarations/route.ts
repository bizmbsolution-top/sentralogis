import { NextRequest, NextResponse } from 'next/server';
import { CustomsService } from '@/lib/domain/customs/customs-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CreateDeclarationDTO, CustomsDeclarationStatus, CustomsChannelType } from '@/lib/domain/customs/types';

const service = new CustomsService();

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const body = await req.json();

    const dto: CreateDeclarationDTO = {
      ...body,
      tenant_id: auth.tenantId
    };

    const aggregate = await service.createDeclaration(dto);

    return NextResponse.json(
      {
        success: true,
        data: aggregate
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { searchParams } = new URL(req.url);

    const status = (searchParams.get('status') as CustomsDeclarationStatus) || undefined;
    const channel = (searchParams.get('channel') as CustomsChannelType) || undefined;
    const importer_id = searchParams.get('importer_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const list = await service.listDeclarations(auth.tenantId, {
      status,
      channel,
      importer_id,
      limit
    });

    return NextResponse.json({
      success: true,
      data: list,
      meta: {
        total: list.length,
        tenant_id: auth.tenantId
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
