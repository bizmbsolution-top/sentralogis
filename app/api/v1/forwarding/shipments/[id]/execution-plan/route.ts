import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { ExecutionPlanService } from '@/lib/domain/shipment/execution-plan-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreateExecutionLegDTO } from '@/lib/domain/shipment/types';

const service = new ShipmentService();
const planService = new ExecutionPlanService();

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
      data: {
        execution_plan: aggregate.execution_plan,
        legs: aggregate.execution_legs,
        allocations: aggregate.leg_unit_allocations
      }
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

    // Verify shipment exists and belongs to tenant
    await service.getShipment(id, auth.tenantId);

    const legsDto: CreateExecutionLegDTO[] = Array.isArray(body.legs) ? body.legs : [];
    const { plan, legs } = planService.buildPlanAndLegs(id, auth.tenantId, legsDto);

    // Validate sequencing
    const validation = planService.validateLegSequencing(legs);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution plan leg sequencing validation failed.',
          details: validation.errors
        },
        { status: 422 }
      );
    }

    // Deactivate previous active plans if any
    await supabaseAdmin
      .from('shp_execution_plans')
      .update({ is_active: false })
      .eq('shipment_id', id)
      .eq('tenant_id', auth.tenantId);

    // Insert new plan
    const { error: planError } = await supabaseAdmin.from('shp_execution_plans').insert({
      id: plan.id,
      tenant_id: plan.tenant_id,
      shipment_id: plan.shipment_id,
      plan_version: plan.plan_version,
      total_legs: legs.length,
      is_active: true
    });

    if (planError) throw new Error(`Failed to insert execution plan: ${planError.message}`);

    // Insert legs
    if (legs.length > 0) {
      const { error: legsError } = await supabaseAdmin.from('shp_execution_legs').insert(
        legs.map(l => ({
          id: l.id,
          tenant_id: l.tenant_id,
          shipment_id: l.shipment_id,
          execution_plan_id: l.execution_plan_id,
          leg_sequence: l.leg_sequence,
          leg_code: l.leg_code,
          transport_mode: l.transport_mode,
          execution_provider_type: l.execution_provider_type,
          origin_location_id: l.origin_location_id,
          destination_location_id: l.destination_location_id,
          assigned_vendor_id: l.assigned_vendor_id,
          planned_start_at: l.planned_start_at,
          planned_end_at: l.planned_end_at,
          aircraft_name: l.aircraft_name,
          flight_number: l.flight_number,
          status: l.status
        }))
      );

      if (legsError) throw new Error(`Failed to insert execution legs: ${legsError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          execution_plan: plan,
          legs
        }
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
