import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { MilestoneService } from '@/lib/domain/shipment/milestone-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';

const service = new ShipmentService();
const milestoneService = new MilestoneService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;

    const aggregate = await service.getShipment(id, auth.tenantId);

    return NextResponse.json({
      success: true,
      data: aggregate.milestones
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id } = await params;
    const body = await req.json();

    const { milestone_code, milestone_label, execution_leg_id, location_id, metadata, occurred_at } = body;

    if (!milestone_code || !milestone_label) {
      return NextResponse.json({ success: false, error: 'Missing milestone_code or milestone_label' }, { status: 400 });
    }

    // Verify shipment exists and belongs to tenant
    await service.getShipment(id, auth.tenantId);

    const milestone = await milestoneService.recordMilestone(
      auth.tenantId,
      id,
      milestone_code,
      milestone_label,
      {
        executionLegId: execution_leg_id,
        locationId: location_id,
        recordedBy: auth.userId,
        metadata,
        occurredAt: occurred_at
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: milestone
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
