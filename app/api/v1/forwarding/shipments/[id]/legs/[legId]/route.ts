import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';

const service = new ShipmentService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; legId: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id, legId } = await params;
    const body = await req.json();

    // Verify shipment exists and belongs to tenant
    await service.getShipment(id, auth.tenantId);

    const allowedUpdates: Record<string, unknown> = {};
    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.origin_location_id !== undefined) allowedUpdates.origin_location_id = body.origin_location_id;
    if (body.destination_location_id !== undefined) allowedUpdates.destination_location_id = body.destination_location_id;
    if (body.transport_mode !== undefined) allowedUpdates.transport_mode = body.transport_mode;
    if (body.execution_provider_type !== undefined) allowedUpdates.execution_provider_type = body.execution_provider_type;
    if (body.leg_sequence !== undefined) allowedUpdates.leg_sequence = body.leg_sequence;
    if (body.leg_code !== undefined) allowedUpdates.leg_code = body.leg_code;
    if (body.planned_start_at !== undefined) allowedUpdates.planned_start_at = body.planned_start_at;
    if (body.planned_end_at !== undefined) allowedUpdates.planned_end_at = body.planned_end_at;
    if (body.assigned_vendor_id !== undefined) allowedUpdates.assigned_vendor_id = body.assigned_vendor_id;
    if (body.actual_start_at !== undefined) allowedUpdates.actual_start_at = body.actual_start_at;
    if (body.actual_end_at !== undefined) allowedUpdates.actual_end_at = body.actual_end_at;
    if (body.aircraft_name !== undefined) allowedUpdates.aircraft_name = body.aircraft_name;
    if (body.flight_number !== undefined) allowedUpdates.flight_number = body.flight_number;
    allowedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('shp_execution_legs')
      .update(allowedUpdates)
      .eq('id', legId)
      .eq('shipment_id', id)
      .eq('tenant_id', auth.tenantId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Execution leg not found or update failed.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; legId: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id, legId } = await params;

    await service.getShipment(id, auth.tenantId);

    // Delete leg allocations first
    await supabaseAdmin
      .from('shp_leg_units')
      .delete()
      .eq('execution_leg_id', legId)
      .eq('tenant_id', auth.tenantId);

    // Delete leg
    const { error } = await supabaseAdmin
      .from('shp_execution_legs')
      .delete()
      .eq('id', legId)
      .eq('shipment_id', id)
      .eq('tenant_id', auth.tenantId);

    if (error) throw new Error(`Failed to delete execution leg: ${error.message}`);

    return NextResponse.json({
      success: true,
      message: `Execution leg ${legId} deleted successfully.`
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
