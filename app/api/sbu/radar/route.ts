import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    // Use service role to bypass RLS for administrative radar view
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    // 1. Fetch Active JOs
    const { data: baseData, error: joError } = await supabaseAdmin
      .from('job_orders')
      .select(`
        id, jo_number, status, updated_at, tenant_id,
        wo_item:wo_items!wo_item_id (
          wo:work_orders!wo_id (
            customer:md_entities!customer_id (name)
          )
        ),
        fleet:md_fleets!fleet_id(plate_number, fleet_type:md_fleet_types!fleet_type_id(icon_url)),
        driver:md_drivers!fk_job_orders_md_driver(name, phone)
      `)
      .not('fleet_id', 'is', null)
      .not('driver_id', 'is', null);

    if (joError) throw joError;

    // Filter active statuses
    const activeData = (baseData || []).filter(jo => 
      !['completed', 'PEKERJAAN SELESAI', 'verified', 'ready_for_billing', 'awaiting_audit', 'cancelled', 'PAID', 'paid', 'INVOICED', 'invoiced'].includes(jo.status)
    );

    const joIds = activeData.map(jo => jo.id);
    
    if (joIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch Latest Tracking for these JOs
    const { data: trackingData, error: tError } = await supabaseAdmin
      .from('job_tracking')
      .select('*')
      .in('job_order_id', joIds)
      .not('latitude', 'is', null)
      .order('created_at', { ascending: false });

    if (tError) throw tError;

    // Group to get only latest per JO
    const latestPosMap = new Map();
    trackingData?.forEach(t => {
      if (!latestPosMap.has(t.job_order_id)) {
        latestPosMap.set(t.job_order_id, t);
      }
    });

    // 3. Format final missions
    const missions = activeData.map(jo => {
      const latest = latestPosMap.get(jo.id);
      
      let iconUrl = (jo.fleet as any)?.fleet_type?.icon_url || null;
      if (iconUrl && !iconUrl.startsWith('http')) {
        iconUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${iconUrl}`;
      }

      return {
        id: jo.id,
        jo_number: jo.jo_number,
        status: jo.status,
        updated_at: latest?.created_at || jo.updated_at,
        plate_number: (jo.fleet as any)?.plate_number,
        fleet_icon: iconUrl,
        driver_name: (jo.driver as any)?.name,
        driver_phone: (jo.driver as any)?.phone,
        customer_name: (jo as any).wo_item?.wo?.customer?.name,
        latitude: latest?.latitude,
        longitude: latest?.longitude
      };
    }).filter(m => m.latitude && m.longitude);

    return NextResponse.json({ data: missions });
  } catch (err: any) {
    console.error('Radar API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
