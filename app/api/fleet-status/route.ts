// GET /api/fleet-status?tenant_id=xxx
// Returns fleet status combined with GPS live data
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenant_id');
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    // 1. Get all active fleets
    const { data: fleets, error: fleetError } = await supabase
      .from('md_fleets')
      .select('id, fleet_code, plate_number, status, brand, model, is_active, entity_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('plate_number');

    if (fleetError) throw fleetError;

    // 2. Get GPS status for these fleets
    const fleetIds = (fleets || []).map(f => f.id);
    const { data: gpsStatuses } = await supabase
      .from('fleet_gps_status')
      .select('*')
      .in('fleet_id', fleetIds);

    const gpsMap = new Map((gpsStatuses || []).map(g => [g.fleet_id, g]));

    // 3. Get active JOs per fleet
    const { data: activeJOs } = await supabase
      .from('job_orders')
      .select('id, fleet_id, jo_number, status')
      .eq('tenant_id', tenantId)
      .in('status', ['assigned', 'in_progress', 'DISPATCHED']);

    const joMap = new Map<string, typeof activeJOs>();
    for (const jo of activeJOs || []) {
      if (!jo.fleet_id) continue;
      const list = joMap.get(jo.fleet_id) || [];
      list.push(jo);
      joMap.set(jo.fleet_id, list);
    }

    // 4. Combine data
    const result = (fleets || []).map(fleet => {
      const gps = gpsMap.get(fleet.id);
      const activeJOs = joMap.get(fleet.id) || [];

      // Determine live status
      let liveStatus: string = 'NO_SIGNAL';
      let engineStatus: string = 'UNKNOWN';
      let lastSeen: string | null = null;
      let lastAddress: string | null = null;
      let speed: number = 0;

      if (gps) {
        lastSeen = gps.gps_time;
        lastAddress = gps.address;
        speed = gps.speed || 0;

        // Check if GPS data is stale (>30 min)
        const gpsAge = gps.gps_time
          ? (Date.now() - new Date(gps.gps_time).getTime()) / 1000 / 60
          : Infinity;

        if (gpsAge > 30) {
          liveStatus = 'STALE';
        } else if (gps.status_vehicle === 2) {
          liveStatus = 'DRIVING';
        } else if (gps.status_vehicle === 1) {
          liveStatus = 'IDLE';
        } else if (gps.status_vehicle === 0) {
          liveStatus = 'PARKING';
        }

        engineStatus = gps.engine_on ? 'ON' : 'OFF';
      }

      return {
        id: fleet.id,
        fleet_code: fleet.fleet_code,
        plate_number: fleet.plate_number,
        db_status: fleet.status || 'available',
        brand: fleet.brand,
        model: fleet.model,
        live_status: liveStatus,
        engine_status: engineStatus,
        speed,
        last_seen: lastSeen,
        last_address: lastAddress,
        active_jo_count: activeJOs.length,
        active_jos: activeJOs.map(j => ({ id: j.id, jo_number: j.jo_number, status: j.status })),
      };
    });

    return NextResponse.json({
      success: true,
      fleets: result,
      summary: {
        total: result.length,
        driving: result.filter(f => f.live_status === 'DRIVING').length,
        idle: result.filter(f => f.live_status === 'IDLE').length,
        parking: result.filter(f => f.live_status === 'PARKING').length,
        no_signal: result.filter(f => f.live_status === 'NO_SIGNAL').length,
        stale: result.filter(f => f.live_status === 'STALE').length,
        engine_on: result.filter(f => f.engine_status === 'ON').length,
        on_job: result.filter(f => f.active_jo_count > 0).length,
      },
    });
  } catch (error: any) {
    console.error('[Fleet Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
