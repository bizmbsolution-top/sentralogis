import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function GET(req: NextRequest) {
  try {
    await resolveCustomsAuthContext(req);
    const { searchParams } = new URL(req.url);

    const q = searchParams.get('q') || searchParams.get('hs_code') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const result = await service.searchHsCodes(q, { page, pageSize });

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
