import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';

const service = new ShipmentService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getShipment(id, auth.tenantId);

    // Build timeline items from milestones, exceptions, and shipment creation
    const timelineItems = [
      ...aggregate.milestones.map(m => ({
        type: 'MILESTONE' as const,
        code: m.milestone_code,
        label: m.milestone_label,
        timestamp: m.occurred_at,
        location_id: m.location_id,
        metadata: m.metadata
      })),
      ...aggregate.exceptions.map(e => ({
        type: 'EXCEPTION' as const,
        code: e.exception_type,
        label: `[${e.severity}] ${e.description}`,
        timestamp: e.created_at,
        is_resolved: e.is_resolved,
        resolved_at: e.resolved_at
      }))
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: {
        shipment_id: id,
        shipment_number: aggregate.shipment.shipment_number,
        global_status: aggregate.shipment.global_status,
        timeline: timelineItems
      }
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
