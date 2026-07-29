// [AI] API: Send push notification to a driver
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification, type PushPayload } from '@/lib/push/sender';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { driver_id, title, body, tag, data, actions } = await req.json();

    if (!driver_id || !title || !body) {
      return NextResponse.json({ error: 'driver_id, title, body required' }, { status: 400 });
    }

    const { data: driver, error: fetchError } = await supabase
      .from('md_drivers')
      .select('id, push_subscription, name')
      .eq('id', driver_id)
      .single();

    if (fetchError || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (!driver.push_subscription) {
      return NextResponse.json({ error: 'Driver has no push subscription', noSubscription: true }, { status: 200 });
    }

    const payload: PushPayload = {
      title,
      body,
      icon: '/sentralogis_logo.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: tag || 'job-assignment',
      data: data || {},
      actions: actions || [],
    };

    const result = await sendPushNotification(driver.push_subscription, payload);

    if (!result.success && result.error === 'SUBSCRIPTION_EXPIRED') {
      await supabase
        .from('md_drivers')
        .update({ push_subscription: null })
        .eq('id', driver_id);
    }

    return NextResponse.json({ success: result.success, error: result.error });
  } catch (err: any) {
    console.error('[Push Send] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
