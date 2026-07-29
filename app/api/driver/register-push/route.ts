// [AI] API: Register driver push subscription from PWA
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { driver_id, push_subscription, device_fingerprint } = await req.json();

    if (!driver_id || !push_subscription) {
      return NextResponse.json({ error: 'driver_id and push_subscription required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('md_drivers')
      .update({
        push_subscription,
        device_fingerprint: device_fingerprint || null,
        last_device_login: new Date().toISOString(),
      })
      .eq('id', driver_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Push Register] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
