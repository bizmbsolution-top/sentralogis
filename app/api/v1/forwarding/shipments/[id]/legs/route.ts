import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreateExecutionLegDTO, ExecutionLeg } from '@/lib/domain/shipment/types';

const service = new ShipmentService();

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
      data: aggregate.execution_legs
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
    const body: CreateExecutionLegDTO = await req.json();

    const aggregate = await service.getShipment(id, auth.tenantId);
    let planId = aggregate.execution_plan?.id;

    // Create plan if none exists
    if (!planId) {
      planId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `plan_${Date.now()}`;
      await supabaseAdmin.from('shp_execution_plans').insert({
        id: planId,
        tenant_id: auth.tenantId,
        shipment_id: id,
        plan_version: 1,
        total_legs: 1,
        is_active: true
      });
    }

    const nextSeq = body.leg_sequence || (aggregate.execution_legs.length + 1);
    const legId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `leg_${Date.now()}`;
    const now = new Date().toISOString();

    const newLeg: ExecutionLeg = {
      id: legId,
      tenant_id: auth.tenantId,
      shipment_id: id,
      execution_plan_id: planId,
      leg_sequence: nextSeq,
      leg_code: body.leg_code || `LEG-${String(nextSeq).padStart(2, '0')}`,
      transport_mode: body.transport_mode,
      execution_provider_type: body.execution_provider_type || 'INTERNAL_SBU',
      origin_location_id: body.origin_location_id,
      destination_location_id: body.destination_location_id,
      assigned_vendor_id: body.assigned_vendor_id || null,
      planned_start_at: body.planned_start_at || null,
      planned_end_at: body.planned_end_at || null,
      aircraft_name: body.aircraft_name || null,
      flight_number: body.flight_number || null,
      actual_start_at: null,
      actual_end_at: null,
      status: 'PLANNED',
      created_at: now,
      updated_at: now
    };

    const { error: legError } = await supabaseAdmin.from('shp_execution_legs').insert({
      id: newLeg.id,
      tenant_id: newLeg.tenant_id,
      shipment_id: newLeg.shipment_id,
      execution_plan_id: newLeg.execution_plan_id,
      leg_sequence: newLeg.leg_sequence,
      leg_code: newLeg.leg_code,
      transport_mode: newLeg.transport_mode,
      execution_provider_type: newLeg.execution_provider_type,
      origin_location_id: newLeg.origin_location_id,
      destination_location_id: newLeg.destination_location_id,
      assigned_vendor_id: newLeg.assigned_vendor_id,
      planned_start_at: newLeg.planned_start_at,
      planned_end_at: newLeg.planned_end_at,
      aircraft_name: newLeg.aircraft_name,
      flight_number: newLeg.flight_number,
      status: newLeg.status
    });

    if (legError) throw new Error(`Failed to insert leg: ${legError.message}`);

    return NextResponse.json(
      {
        success: true,
        data: newLeg
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
