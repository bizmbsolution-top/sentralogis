import { SupabaseClient } from '@supabase/supabase-js';
import { sendPushNotification, type PushPayload } from '@/lib/push/sender';

const COMPLETED_STATUSES = ['PEKERJAAN SELESAI', 'COMPLETED'];
const WAITING_STATUS = 'MENUNGGU SELESAI';
const GRACE_PERIOD_MS = 30 * 60 * 1000;

// Shared auto-complete logic for trucking JOs.
// Used by the jo-autocomplete cron AND lazily from the driver JO API so a JO
// finishes without waiting for the (once-daily, Vercel Hobby) cron window.
export class JoAutoCompleteService {
  constructor(private readonly supabase: SupabaseClient) {}

  // Find JOs waiting for completion where departure was > 30 minutes ago.
  // Fallback: JO with all routes completed and last route activity > 30 min ago
  // even when departure_detected_at is NULL (legacy data before geofence fix).
  public async findEligibleJOs(limit = 50): Promise<any[]> {
    const thirtyMinAgo = new Date(Date.now() - GRACE_PERIOD_MS).toISOString();

    const { data, error } = await this.supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id, driver_id, fleet_id, wo_item_id, base_price, purchase_price, driver_link_token, departure_detected_at')
      .eq('status', WAITING_STATUS)
      .limit(limit);

    if (error) {
      console.error('[JoAutoComplete] Query error:', error.message);
      return [];
    }

    const eligible: any[] = [];
    for (const jo of data || []) {
      if (jo.departure_detected_at && new Date(jo.departure_detected_at).getTime() <= Date.now() - GRACE_PERIOD_MS) {
        eligible.push(jo);
        continue;
      }

      if (await this.routesDepartedLongEnough(jo.id, thirtyMinAgo)) {
        eligible.push(jo);
      }
    }

    return eligible;
  }

  // Lazy check for the driver JO API: complete immediately if this JO qualifies.
  public async maybeAutoComplete(joId: string): Promise<boolean> {
    const { data: jo } = await this.supabase
      .from('job_orders')
      .select('id, jo_number, status, tenant_id, driver_id, fleet_id, wo_item_id, base_price, purchase_price, driver_link_token, departure_detected_at')
      .eq('id', joId)
      .maybeSingle();

    if (!jo || jo.status !== WAITING_STATUS) return false;

    const thirtyMinAgo = new Date(Date.now() - GRACE_PERIOD_MS).toISOString();
    const departedLongEnough =
      (jo.departure_detected_at && new Date(jo.departure_detected_at).getTime() <= Date.now() - GRACE_PERIOD_MS) ||
      (await this.routesDepartedLongEnough(jo.id, thirtyMinAgo));

    if (!departedLongEnough) return false;

    return this.completeJo(jo);
  }

  // All routes completed AND the latest route activity is older than the grace period.
  private async routesDepartedLongEnough(joId: string, thirtyMinAgo: string): Promise<boolean> {
    const { data: routes } = await this.supabase
      .from('job_routes')
      .select('status, actual_departure, actual_arrival, updated_at')
      .eq('job_order_id', joId);

    if (!routes || routes.length === 0) return false;

    const allCompleted = routes.every((r: any) => r.status === 'completed');
    if (!allCompleted) return false;

    const latest = routes.reduce((max: number, r: any) => {
      const t = new Date(r.actual_departure || r.actual_arrival || r.updated_at).getTime() || 0;
      return Math.max(max, t);
    }, 0);

    return latest > 0 && latest <= Date.now() - GRACE_PERIOD_MS;
  }

  // Mark JO complete + free fleet + driver stats + wo_items + journal + logs.
  public async completeJo(jo: any): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      const { error: updateErr } = await this.supabase
        .from('job_orders')
        .update({
          status: 'PEKERJAAN SELESAI',
          completed_at: now,
          updated_at: now,
        })
        .eq('id', jo.id);

      if (updateErr) {
        console.error(`[JoAutoComplete] Failed to update JO ${jo.jo_number}:`, updateErr.message);
        return false;
      }

      if (jo.fleet_id) {
        await this.supabase
          .from('md_fleets')
          .update({ status: 'available', updated_at: now })
          .eq('id', jo.fleet_id);
      }

      if (jo.driver_id) {
        const { data: driver } = await this.supabase
          .from('md_drivers')
          .select('id, name, total_jobs_completed, push_subscription')
          .eq('id', jo.driver_id)
          .single();

        if (driver) {
          await this.supabase
            .from('md_drivers')
            .update({
              total_jobs_completed: (driver.total_jobs_completed || 0) + 1,
              status: 'available',
              is_working: false,
            })
            .eq('id', jo.driver_id);

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
              console.warn(`[JoAutoComplete] Push failed for driver ${driver.name}:`, err)
            );
          }
        }
      }

      if (jo.wo_item_id) {
        const { data: siblingJOs } = await this.supabase
          .from('job_orders')
          .select('id, status')
          .eq('wo_item_id', jo.wo_item_id);

        const allCompleted = siblingJOs?.every(
          (j: any) => j.id === jo.id || COMPLETED_STATUSES.includes(j.status)
        );

        await this.supabase
          .from('wo_items')
          .update({
            status: allCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            updated_at: now,
          })
          .eq('id', jo.wo_item_id);
      }

      const basePrice = Number(jo.base_price) || 0;
      const purchasePrice = Number(jo.purchase_price) || 0;

      if (basePrice > 0) {
        try {
          await this.supabase.from('journal_entries').insert({
            tenant_id: jo.tenant_id,
            reference_type: 'job_order',
            reference_id: jo.id,
            description: `[Auto] Revenue JO ${jo.jo_number}`,
            debit: basePrice,
            credit: 0,
            entry_date: now,
          });
        } catch (e) {
          // ignore if journal_entries table doesn't exist yet
        }
      }

      if (purchasePrice > 0) {
        try {
          await this.supabase.from('journal_entries').insert({
            tenant_id: jo.tenant_id,
            reference_type: 'job_order',
            reference_id: jo.id,
            description: `[Auto] Cost JO ${jo.jo_number}`,
            debit: 0,
            credit: purchasePrice,
            entry_date: now,
          });
        } catch (e) {
          // ignore if journal_entries table doesn't exist yet
        }
      }

      await this.supabase.from('job_tracking').insert({
        job_order_id: jo.id,
        tenant_id: jo.tenant_id || null,
        status_update: '✅ Auto-complete (30 menit setelah meninggalkan lokasi terakhir)',
        notes: `JO ${jo.jo_number} otomatis selesai setelah driver meninggalkan lokasi terakhir selama 30 menit.`,
      });

      await this.supabase.from('notifications').insert({
        role: 'tenant_admin',
        tenant_id: jo.tenant_id || null,
        type: 'jo_autocomplete',
        title: `✅ JO ${jo.jo_number} Auto-Complete`,
        message: `JO ${jo.jo_number} otomatis selesai. Driver telah meninggalkan lokasi terakhir > 30 menit.`,
        link: `/sbu/trucking/work-orders`,
      });

      return true;
    } catch (err: any) {
      console.error(`[JoAutoComplete] Error completing JO ${jo.jo_number}:`, err.message);
      return false;
    }
  }
}
