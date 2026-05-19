import { createAdminClient } from '../lib/supabase/admin.js';

async function checkMdLocation() {
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

  console.log('--- Current job_routes Data ---');
  routes?.forEach(r => {
    console.log(`[${r.sequence}] ${r.location_name}: Lat=${r.latitude}, Lng=${r.longitude}, LocationID=${r.location_id}`);
  });

  console.log('\n--- Checking md_location for these Location IDs ---');
  const locationIds = routes?.map(r => r.location_id).filter(Boolean) || [];
  
  if (locationIds.length > 0) {
    const { data: locations } = await supabase
      .from('md_locations')
      .select('id, name, latitude, longitude')
      .in('id', locationIds);

    locations?.forEach(l => {
      console.log(`${l.name}: Lat=${l.latitude}, Lng=${l.longitude}`);
    });
  }
}

checkMdLocation();
