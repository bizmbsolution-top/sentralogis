import { NextRequest, NextResponse } from 'next/server';
import { CustomsAuditService } from '@/lib/domain/customs/audit/customs-audit-service';
import { resolveCustomsAuthContext, handleCustomsError } from '@/lib/domain/customs/api-helper';
import { CustomsAuditEventCategory, CustomsAuditEventType, CustomsActorType } from '@/lib/domain/customs/audit/types';

const auditService = new CustomsAuditService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveCustomsAuthContext(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category') as CustomsAuditEventCategory | undefined;
    const eventType = searchParams.get('eventType') as CustomsAuditEventType | undefined;
    const actorType = searchParams.get('actorType') as CustomsActorType | undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [timeline, journey, integrity] = await Promise.all([
      auditService.getTimeline(id, auth.tenantId, { category, eventType, actorType, limit, offset }),
      auditService.getDeclarationJourney(id, auth.tenantId),
      auditService.verifyDeclarationIntegrity(id, auth.tenantId)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events: timeline.events,
        totalCount: timeline.totalCount,
        journey,
        integrity
      }
    });
  } catch (err: unknown) {
    return handleCustomsError(err);
  }
}
