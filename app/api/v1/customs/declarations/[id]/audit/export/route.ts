import { NextRequest, NextResponse } from 'next/server';
import { CustomsAuditService } from '@/lib/domain/customs/audit/customs-audit-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const auditService = new CustomsAuditService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const format = (body.format || 'JSON') as 'JSON' | 'CSV';

    const pkg = await auditService.exportAuditPackage(id, auth.tenantId, format);

    return new NextResponse(pkg.content, {
      headers: {
        'Content-Type': pkg.mimeType,
        'Content-Disposition': `attachment; filename="${pkg.filename}"`
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
