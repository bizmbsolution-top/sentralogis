import { NextRequest, NextResponse } from 'next/server';
import { CustomsAuditService } from '@/lib/domain/customs/audit/customs-audit-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';

const auditService = new CustomsAuditService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;

    const integrityReport = await auditService.verifyDeclarationIntegrity(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: integrityReport
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
