import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { searchParams } = new URL(req.url);

    const importer_id = searchParams.get('importer_id') || undefined;
    const sku_code = searchParams.get('sku_code') || undefined;
    const q = searchParams.get('q') || undefined;
    const brand = searchParams.get('brand') || undefined;
    const hs_code = searchParams.get('hs_code') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const result = await service.searchSkuIntelligence(
      auth.tenantId,
      { importer_id, sku_code, q, brand, hs_code },
      { page, pageSize }
    );

    return NextResponse.json({
      success: true,
      data: result.results,
      pagination: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize)
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const body = await req.json();

    const created = await service.registerSkuIntelligence(
      auth.tenantId,
      body,
      auth.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: created
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
