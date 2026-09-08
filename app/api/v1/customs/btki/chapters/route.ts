import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function GET(req: NextRequest) {
  try {
    await resolveCustomsAuthContext(req);
    const chapters = await service.getBtkiChapters();

    return NextResponse.json({
      success: true,
      data: chapters
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
