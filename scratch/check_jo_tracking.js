import { createAdminClient } from '../lib/supabase/admin.js';

async function checkTracking() {
  const supabase = createAdminClient();
  const jo_number = 'WO/05/2026/009-JO-001';

  console.log(`Checking tracking for JO: ${jo_number}`);

  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('id, jo_number, status')
    .eq('jo_number', jo_number)
    .single();

  if (joError) {
    console.error('JO Error:', joError);
    return;
  }

  console.log('JO found:', jo.id);

  const { data: tracking, error: trackingError } = await supabase
    .from('job_tracking')
    .select('*')
    .eq('job_order_id', jo.id)
    .order('created_at', { ascending: false });

  if (trackingError) {
    console.error('Tracking Error:', trackingError);
  } else {
    console.log(`Found ${tracking.length} tracking points.`);
    tracking.forEach(t => {
      console.log(`[${t.created_at}] Status: ${t.status_update}, Lat: ${t.latitude}, Lng: ${t.longitude}`);
    });
  }
}

checkTracking();
