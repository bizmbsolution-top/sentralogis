import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findJobOrder(token: string) {
  if (!token) return null;
  const isUuid = token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (isUuid) {
    const { data } = await supabase
      .from('job_orders')
      .select('id, driver_id, driver_link_token')
      .or(`id.eq.${token},wa_token.eq.${token},tracking_token.eq.${token},driver_link_token.eq.${token}`)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase
    .from('job_orders')
    .select('id, driver_id, driver_link_token')
    .or(`tracking_token.eq.${token},driver_link_token.eq.${token}`)
    .maybeSingle();
  return data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      job_order_id, 
      token, 
      internet_connected, 
      gps_active, 
      background_running, 
      battery_level, 
      accuracy,
      ping_latency_ms 
    } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 });
    }

    const jo = await findJobOrder(token);
    if (!jo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolved_job_order_id = job_order_id || jo.id;

    let health_status = 'GOOD';
    if (!internet_connected || !gps_active || !background_running) {
      health_status = 'CRITICAL';
    } else if (battery_level !== undefined && battery_level < 20) {
      health_status = 'WARNING';
    } else if (accuracy !== undefined && accuracy > 100) {
      health_status = 'WARNING';
    }

    await supabase
      .from('job_orders')
      .update({
        device_health: health_status,
        last_device_health_ping_at: new Date().toISOString()
      })
      .eq('id', resolved_job_order_id);

    await supabase.from('device_health_logs').insert({
      job_order_id: resolved_job_order_id,
      driver_id: jo.driver_id,
      internet_connected,
      gps_active,
      background_running,
      battery_level,
      accuracy,
      ping_latency_ms
    });

    return NextResponse.json({ success: true, health_status });
  } catch (error: any) {
    console.error('[Health Ping Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
