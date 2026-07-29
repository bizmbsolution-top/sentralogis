// [AI] Cron: Auto-complete JOs after 30 minutes of departure from final stop
// Runs every 5 minutes via Vercel Cron
// Finds JOs with status 'MENUNGGU SELESAI' where departure_detected_at > 30 min ago
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
    const results: Array<{ jo_id: string; jo_number: string }> = [];

    // Find JOs waiting for completion where departure was > 30 minutes ago
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: eligibleJOs, error: queryError } = await supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id, driver_id, fleet_id, wo_item_id, base_price, purchase_price, driver_link_token')
      .eq('status', 'MENUNGGU SELESAI')
      .not('departure_detected_at', 'is', null)
      .lte('departure_detected_at', thirtyMinAgo)
      .limit(50);

    if (queryError) {
      console.error('[JO AutoComplete] Query error:', queryError.message);
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 });
    }

    if (!eligibleJOs || eligibleJOs.length === 0) {
      return NextResponse.json({ success: true, completed: 0, message: 'No eligible JOs' });
    }

    for (const jo of eligibleJOs) {
      try {
        const now = new Date().toISOString();

        // 1. Update JO to COMPLETED
        const { error: updateErr } = await supabase
          .from('job_orders')
          .update({
            status: 'PEKERJAAN SELESAI',
            completed_at: now,
            updated_at: now,
          })
          .eq('id', jo.id);

        if (updateErr) {
          console.error(`[JO AutoComplete] Failed to update JO ${jo.jo_number}:`, updateErr.message);
          continue;
        }

        // 2. Free fleet
        if (jo.fleet_id) {
          await supabase
            .from('md_fleets')
            .update({ status: 'available', updated_at: now })
            .eq('id', jo.fleet_id);
        }

        // 3. Update driver stats
        if (jo.driver_id) {
          // Increment completed jobs
          const { data: driver } = await supabase
            .from('md_drivers')
            .select('id, name, total_jobs_completed, push_subscription, is_working')
            .eq('id', jo.driver_id)
            .single();

          if (driver) {
            await supabase
              .from('md_drivers')
              .update({
                total_jobs_completed: (driver.total_jobs_completed || 0) + 1,
                status: 'available',
                is_working: false,
              })
              .eq('id', jo.driver_id);

            // Send push notification
            if (driver.push_subscription) {
              const payload: PushPayload = {
                title: '✅ Tugas Selesai',
                body: `JO ${jo.jo_number} telah selesai secara otomatis. Terima kasih!`,
                icon: '/sentralogis_logo.png',
                badge: '/favicon.ico',
                vibrate: [200, 100, 200],
                tag: `jo-complete-${jo.id}`,
                data: { job_id: jo.id, token: jo.driver_link_token },
              };
              await sendPushNotification(driver.push_subscription, payload).catch((err) =>
                console.warn(`[JO AutoComplete] Push failed for driver ${driver.name}:`, err)
              );
            }
          }
        }

        // 4. Update parent wo_items status
        if (jo.wo_item_id) {
          // Check if all JOs for this wo_item are completed
          const { data: siblingJOs } = await supabase
            .from('job_orders')
            .select('id, status')
            .eq('wo_item_id', jo.wo_item_id);

          const allCompleted = siblingJOs?.every(
            (j: any) => j.id === jo.id || ['PEKERJAAN SELESAI', 'COMPLETED'].includes(j.status)
          );

          await supabase
            .from('wo_items')
            .update({
              status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
              updated_at: now,
            })
            .eq('id', jo.wo_item_id);
        }

        // 5. Auto-journal entries (revenue & cost)
        const basePrice = Number(jo.base_price) || 0;
        const purchasePrice = Number(jo.purchase_price) || 0;

        if (basePrice > 0) {
          await supabase.from('journal_entries').insert({
            tenant_id: jo.tenant_id,
            reference_type: 'job_order',
            reference_id: jo.id,
            description: `[Auto] Revenue JO ${jo.jo_number}`,
            debit: basePrice,
            credit: 0,
            entry_date: now,
          }).catch(() => {}); // ignore if journal_entries table doesn't exist yet
        }

        if (purchasePrice > 0) {
          await supabase.from('journal_entries').insert({
            tenant_id: jo.tenant_id,
            reference_type: 'job_order',
            reference_id: jo.id,
            description: `[Auto] Cost JO ${jo.jo_number}`,
            debit: 0,
            credit: purchasePrice,
            entry_date: now,
          }).catch(() => {});
        }

        // 6. Insert tracking log
        await supabase.from('job_tracking').insert({
          job_order_id: jo.id,
          status_update: '✅ Auto-complete (30 menit setelah meninggalkan lokasi terakhir)',
          notes: `JO ${jo.jo_number} otomatis selesai setelah driver meninggalkan lokasi terakhir selama 30 menit.`,
        });

        // 7. Notification for ops
        await supabase.from('notifications').insert({
          role: 'tenant_admin',
          tenant_id: jo.tenant_id || null,
          type: 'jo_autocomplete',
          title: `✅ JO ${jo.jo_number} Auto-Complete`,
          message: `JO ${jo.jo_number} otomatis selesai. Driver telah meninggalkan lokasi terakhir > 30 menit.`,
          link: `/sbu/trucking/work-orders`,
        });

        results.push({ jo_id: jo.id, jo_number: jo.jo_number });
      } catch (err: any) {
        console.error(`[JO AutoComplete] Error processing JO ${jo.jo_number}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      completed: results.length,
      details: results,
    });
  } catch (err: any) {
    console.error('[JO AutoComplete] Cron error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
