import { NextRequest, NextResponse } from 'next/server';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { resolveApiAuthContext, handleDomainError } from '@/lib/domain/shipment/api-helper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { UnitAllocationError } from '@/lib/domain/shipment/errors';

const service = new ShipmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; legId: string }> }
) {
  try {
    const auth = await resolveApiAuthContext(req);
    const { id, legId } = await params;
    const body = await req.json();

    const aggregate = await service.getShipment(id, auth.tenantId);

    // Verify leg belongs to shipment
    const leg = aggregate.execution_legs.find(l => l.id === legId);
    if (!leg) {
      return NextResponse.json({ success: false, error: `Leg ${legId} does not belong to shipment ${id}` }, { status: 404 });
    }

    const unitIds: string[] = Array.isArray(body.unit_ids) ? body.unit_ids : body.unit_id ? [body.unit_id] : [];
    if (unitIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing unit_ids in request body' }, { status: 400 });
    }

    // Verify all units belong to THIS shipment (Reject cross-shipment assignment)
    const validShipmentUnitIds = new Set(aggregate.units.map(u => u.id));
    for (const uid of unitIds) {
      if (!validShipmentUnitIds.has(uid)) {
        throw new UnitAllocationError(uid, legId, `Unit does not belong to shipment ${id}`);
      }
    }

    const allocations = unitIds.map(uid => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `alloc_${Date.now()}_${uid}`,
      tenant_id: auth.tenantId,
      execution_leg_id: legId,
      unit_id: uid,
      allocated_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin.from('shp_leg_units').insert(allocations);
    if (error) throw new Error(`Failed to allocate units to leg: ${error.message}`);

    return NextResponse.json(
      {
        success: true,
        data: allocations
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return handleDomainError(err);
  }
}
