import { createAdminClient } from '../lib/supabase/admin.js';

async function syncCoordinates() {
  const supabase = createAdminClient();
  const jo_number = 'WO/05/2026/009-JO-001';

  console.log(`Syncing coordinates for JO: ${jo_number}`);

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

  for (const route of routes || []) {
    const { data: locations } = await supabase
      .from('md_locations')
      .select('latitude, longitude')
      .eq('name', route.location_name)
      .limit(1);

    if (locations && locations[0]) {
      const { latitude, longitude } = locations[0];
      console.log(`Updating ${route.location_name} to Lat: ${latitude}, Lng: ${longitude}`);
      
      await supabase
        .from('job_routes')
        .update({ latitude, longitude })
        .eq('id', route.id);
    }
  }
  console.log('Sync complete.');
}

syncCoordinates();
