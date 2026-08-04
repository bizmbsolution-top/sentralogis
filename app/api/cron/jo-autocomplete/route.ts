// [AI] Cron: Auto-complete JOs after 30 minutes of departure from final stop
// Runs via Vercel Cron (daily on Hobby). A lazy fallback in the driver JO API
// (app/api/jo/[token]) completes eligible JOs without waiting for this window.
// Finds JOs with status 'MENUNGGU SELESAI' where departure was > 30 min ago,
// with fallback for JOs whose departure_detected_at is NULL but all routes
// completed (legacy data from the pre-geofence era).
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { JoAutoCompleteService } from '@/src/application/trucking/services/JoAutoCompleteService';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const service = new JoAutoCompleteService(supabase);

    const eligibleJOs = await service.findEligibleJOs(50);

    if (eligibleJOs.length === 0) {
      return NextResponse.json({ success: true, completed: 0, message: 'No eligible JOs' });
    }

    const results: Array<{ jo_id: string; jo_number: string }> = [];
    for (const jo of eligibleJOs) {
      const done = await service.completeJo(jo);
      if (done) {
        results.push({ jo_id: jo.id, jo_number: jo.jo_number });
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
