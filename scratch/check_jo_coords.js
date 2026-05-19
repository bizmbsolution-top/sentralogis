import { createAdminClient } from '../lib/supabase/admin.js';

async function checkRouteCoordinates() {
  const supabase = createAdminClient();
  const jo_number = 'WO/05/2026/009-JO-001';

  const { data: jo } = await supabase
    .from('job_orders')
    .select('id')
    .eq('jo_number', jo_number)
    .single();

  if (!jo) return;

  const { data: routes } = await supabase
    .from('job_routes')
    .select('*')
    .eq('job_order_id', jo.id);

  console.log('--- Routes for JO ---');
  routes?.forEach(r => {
    console.log(`[${r.sequence}] ${r.location_name}: Lat=${r.latitude}, Lng=${r.longitude}`);
  });

  const { data: tracking } = await supabase
    .from('job_tracking')
    .select('*')
    .eq('job_order_id', jo.id);

  console.log('--- Tracking for JO ---');
  tracking?.forEach(t => {
    console.log(`[${t.created_at}] Lat=${t.latitude}, Lng=${t.longitude}`);
  });
}

checkRouteCoordinates();
