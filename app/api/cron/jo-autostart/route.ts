// [AI] Cron: Auto-confirm after 30 mins & Auto-start GPS at planned_departure_at
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification, type PushPayload } from '@/lib/push/sender';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const results = { autoConfirmed: 0, autoStarted: 0 };
    const nowIso = new Date().toISOString();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // 1. AUTO CONFIRM LOGIC
    const { data: toConfirm } = await supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id')
      .eq('status', 'ASSIGNED')
      .not('assigned_at', 'is', null)
      .lte('assigned_at', thirtyMinAgo)
      .limit(50);

    if (toConfirm && toConfirm.length > 0) {
      for (const jo of toConfirm) {
        // Call RPC for atomic race-condition safe update
        const { data: rpcRes, error } = await supabase.rpc('vendor_job_confirmation', {
          p_jo_id: jo.id,
          p_is_accepted: false,
          p_is_timeout: true
        });
        
        if (!error && rpcRes?.success) {
          results.autoConfirmed++;
          
          await supabase.from('notifications').insert({
            role: 'tenant_admin',
            tenant_id: jo.tenant_id,
            type: 'jo_autoconfirm',
            title: `⏱️ JO ${jo.jo_number} Auto-Confirmed`,
            message: `JO ${jo.jo_number} otomatis terkonfirmasi karena driver tidak merespons selama 30 menit.`,
            link: `/sbu/trucking/work-orders`,
          });
        }
      }
    }

    // 2. AUTO START LOGIC (Based on planned_departure_at)
    // If planned_departure_at is null, we assume it should start immediately after CONFIRMED (fallback mechanism)
    const { data: toStart } = await supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id, driver_id, driver_link_token, planned_departure_at')
      .in('status', ['AUTO_CONFIRMED', 'CONFIRMED_BY_DRIVER'])
      .or(`planned_departure_at.lte.${nowIso},planned_departure_at.is.null`)
      .limit(50);

    if (toStart && toStart.length > 0) {
      for (const jo of toStart) {
        // Get first route stop
        const { data: firstRoute } = await supabase
          .from('job_routes')
          .select('location_name')
          .eq('job_order_id', jo.id)
          .order('sequence', { ascending: true })
          .limit(1)
          .single();

        const firstStopName = firstRoute?.location_name || 'Tujuan';
        const newStatus = `MENUJU ${firstStopName}`;

        const { error: updateErr } = await supabase
          .from('job_orders')
          .update({
            status: newStatus,
            job_status: 'IN_PROGRESS',
            gps_status: 'STARTING',
            started_at: nowIso,
            gps_started_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', jo.id)
          .in('status', ['AUTO_CONFIRMED', 'CONFIRMED_BY_DRIVER']); // Optimistic lock

        if (!updateErr) {
          results.autoStarted++;
          
          await supabase.from('job_tracking').insert({
            job_order_id: jo.id,
            status_update: '🚀 Auto-Start GPS',
            notes: `Waktu keberangkatan tercapai. GPS Tracker dimulai.`,
          });

          if (jo.driver_id) {
            const { data: driver } = await supabase
              .from('md_drivers')
              .select('id, push_subscription')
              .eq('id', jo.driver_id)
              .single();

            if (driver?.push_subscription) {
              const payload: PushPayload = {
                title: '🚀 Waktu Keberangkatan Tiba',
                body: `JO ${jo.jo_number} otomatis dimulai. Silakan jalan menuju ${firstStopName}.`,
                icon: '/sentralogis_logo.png',
                tag: `jo-autostart-${jo.id}`,
                data: { job_id: jo.id, token: jo.driver_link_token },
              };
              await sendPushNotification(driver.push_subscription, payload).catch(() => {});
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[JO AutoStart Cron Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
