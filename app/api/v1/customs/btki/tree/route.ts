import { NextRequest, NextResponse } from 'next/server';
import { PpjkWorkbenchService } from '@/lib/domain/customs/ppjk-workbench-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const service = new PpjkWorkbenchService();

export async function GET(req: NextRequest) {
  try {
    await resolveCustomsAuthContext(req);
    const { searchParams } = new URL(req.url);

    const chapter = searchParams.get('chapter') || undefined;
    const heading = searchParams.get('heading') || undefined;
    const q = searchParams.get('q') || undefined;

    const result = await service.getBtkiHierarchyTree({ chapter, heading, q });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
