import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';

const service = new ShipmentService();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; legId: string; unitId: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id, legId, unitId } = await params;

    await service.getShipment(id, auth.tenantId);

    const { error } = await supabaseAdmin
      .from('shp_leg_units')
      .delete()
      .eq('execution_leg_id', legId)
      .eq('unit_id', unitId)
      .eq('tenant_id', auth.tenantId);

    if (error) throw new Error(`Failed to remove unit from leg: ${error.message}`);

    return NextResponse.json({
      success: true,
      message: `Unit ${unitId} removed from leg ${legId}.`
    });
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
