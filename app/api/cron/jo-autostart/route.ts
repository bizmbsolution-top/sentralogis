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
    const results = { autoStarted: 0 };
    const nowIso = new Date().toISOString();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // 1. AUTO-START LOGIC — ASSIGNED after 30 min langsung auto-start (skip confirm dialog)
    const { data: toStart } = await supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id, driver_id, driver_link_token, planned_departure_at')
      .eq('status', 'ASSIGNED')
      .not('assigned_at', 'is', null)
      .lte('assigned_at', thirtyMinAgo)
      .limit(50);

    if (toStart && toStart.length > 0) {
      for (const jo of toStart) {
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
          .eq('status', 'ASSIGNED');

        if (!updateErr) {
          results.autoStarted++;
          
          await supabase.from('job_tracking').insert({
            job_order_id: jo.id,
            status_update: 'Auto-Start',
            notes: `JO otomatis dimulai setelah 30 menit. GPS aktif.`,
          });

          if (jo.driver_id) {
            const { data: driver } = await supabase
              .from('md_drivers')
              .select('id, push_subscription')
              .eq('id', jo.driver_id)
              .single();

            if (driver?.push_subscription) {
              const payload: PushPayload = {
                title: 'Waktu Keberangkatan Tiba',
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
