import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    // Use service role to bypass RLS for administrative radar view
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch Active JOs filtered by tenant if provided
    let query = supabaseAdmin
      .from('job_orders')
      .select('id, jo_number, status, updated_at, tenant_id, fleet_id, driver_id, wo_item_id')
      .not('fleet_id', 'is', null)
      .not('driver_id', 'is', null);

    if (tenantId && tenantId !== 'ALL' && tenantId !== 'undefined' && tenantId !== 'null') {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: baseData, error: joError } = await query;

    if (joError) throw joError;

    // Filter active statuses matching FleetTrackingConsole logic
    const DONE_STATUSES = ['COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID'];
    const REJECTED_STATUSES = ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'];
    const ACTIVE_STATUSES = [
      'IN_PROGRESS', 'DALAM PERJALANAN', 'ON ROAD', 'ON JOURNEY', 'ON_ROAD',
      'MENUJU ASAL', 'TIBA DI ASAL', 'PICKING_UP', 'DELIVERING', 
      'START JOURNEY', 'MENUNGGU BERANGKAT', 'STARTED', 'LOADING', 
      'UNLOADING', 'DITERIMA', 'SELESAI', 'ORDER DITERIMA', 'ACCEPTED'
    ];

    const activeData = (baseData || []).filter(jo => {
      const s = (jo.status || '').toUpperCase();
      if (DONE_STATUSES.includes(s) || REJECTED_STATUSES.includes(s) || s === 'DRAFT') return false;
      return (
        ACTIVE_STATUSES.includes(s) ||
        s.startsWith('TIBA DI') ||
        s.startsWith('MENUJU')
      );
    });

    if (activeData.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const joIds = activeData.map(jo => jo.id);
    const driverIds = [...new Set(activeData.map(jo => jo.driver_id).filter(Boolean))];
    const fleetIds = [...new Set(activeData.map(jo => jo.fleet_id).filter(Boolean))];
    const woItemIds = [...new Set(activeData.map(jo => jo.wo_item_id).filter(Boolean))];

    // 2. Parallel fetch related tables safely without fragile constraint names
    const [driversRes, fleetsRes, woItemsRes, trackingRes, routesRes] = await Promise.all([
      supabaseAdmin.from('md_drivers').select('id, name, phone').in('id', driverIds),
      supabaseAdmin.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(id, icon_url)').in('id', fleetIds),
      supabaseAdmin.from('wo_items').select('id, wo_id, item_data, wo:work_orders!wo_id(customer:md_entities!customer_id(name))').in('id', woItemIds),
      supabaseAdmin.from('job_tracking').select('*').in('job_order_id', joIds).not('latitude', 'is', null).order('created_at', { ascending: false }),
      supabaseAdmin.from('job_routes').select('*').in('job_order_id', joIds).order('sequence', { ascending: true })
    ]);

    // Group latest tracking per JO
    const latestPosMap = new Map();
    trackingRes.data?.forEach(t => {
      if (t.latitude && t.longitude && Number(t.latitude) !== 0 && !latestPosMap.has(t.job_order_id)) {
        latestPosMap.set(t.job_order_id, t);
      }
    });

    // 3. Format final missions with robust coordinate fallback
    const missions = activeData.map(jo => {
      const driver = driversRes.data?.find(d => d.id === jo.driver_id);
      const fleet = fleetsRes.data?.find(f => f.id === jo.fleet_id);
      const woItem = woItemsRes.data?.find(w => w.id === jo.wo_item_id);
      const customerName = (woItem as any)?.wo?.customer?.name || 'PRIVATE CLIENT';

      const latestTracking = latestPosMap.get(jo.id);
      let lat = latestTracking ? Number(latestTracking.latitude) : null;
      let lng = latestTracking ? Number(latestTracking.longitude) : null;

      // Fallback to job_routes or wo_item stops if no tracking point
      if (lat === null || lng === null) {
        const routes = (routesRes.data || []).filter(r => r.job_order_id === jo.id);
        const arrivedRoute = routes.find(r => r.latitude && r.longitude && Number(r.latitude) !== 0 && (r.status === 'arrived' || r.status === 'completed'));
        const pickupRoute = routes.find(r => r.latitude && r.longitude && Number(r.latitude) !== 0);
        const fallbackRoute = arrivedRoute || pickupRoute;
        
        if (fallbackRoute) {
          lat = Number(fallbackRoute.latitude);
          lng = Number(fallbackRoute.longitude);
        } else {
          // Fallback to origin stop from item_data
          const stops = (woItem?.item_data as any)?.stops || [];
          if (stops.length > 0 && stops[0].latitude && stops[0].longitude && Number(stops[0].latitude) !== 0) {
            lat = Number(stops[0].latitude);
            lng = Number(stops[0].longitude);
          }
        }
      }

      let iconUrl = (fleet as any)?.fleet_type?.icon_url || null;
      if (iconUrl && !iconUrl.startsWith('http')) {
        iconUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${iconUrl}`;
      }

      return {
        id: jo.id,
        jo_number: jo.jo_number,
        status: jo.status,
        updated_at: latestTracking?.created_at || jo.updated_at,
        plate_number: fleet?.plate_number || 'NO PLATE',
        fleet_icon: iconUrl,
        driver_name: driver?.name || 'DRIVER',
        driver_phone: driver?.phone || '',
        customer_name: customerName,
        latitude: lat,
        longitude: lng
      };
    }).filter(m => m.latitude !== null && m.longitude !== null && !isNaN(m.latitude) && !isNaN(m.longitude));

    return NextResponse.json({ data: missions });
  } catch (err: any) {
    console.error('Radar API Error:', err);
    return NextResponse.json({ error: err.message || 'Server error fetching radar matrix' }, { status: 500 });
  }
}
