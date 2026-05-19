import { createAdminClient } from '../lib/supabase/admin.js';

async function fixJo() {
  const supabase = createAdminClient();
  const jo_number = 'WO/05/2026/009-JO-001';

  console.log(`Fixing coordinates for JO: ${jo_number}`);

  const { data: jo } = await supabase
    .from('job_orders')
    .select('id')
    .eq('jo_number', jo_number)
    .single();

  if (!jo) return;

  // Correct coordinates found in md_entity_addresses
  const correctCoords = {
    'NPCT1 Port': { lat: -6.0948999, lng: 106.9230484 },
    'TPS - PABRIK TPS JAKARTA': { lat: -6.3157584, lng: 107.1224556 },
    'DEPO SIL': { lat: -6.108451, lng: 106.951143 }
  };

  const { data: routes } = await supabase
    .from('job_routes')
    .select('*')
    .eq('job_order_id', jo.id);

  for (const route of routes || []) {
    const coords = correctCoords[route.location_name];
    if (coords) {
      console.log(`Updating ${route.location_name} to correct Master Data coords: Lat=${coords.lat}, Lng=${coords.lng}`);
      await supabase
        .from('job_routes')
        .update({ latitude: coords.lat, longitude: coords.lng })
        .eq('id', route.id);
    }
  }
  console.log('Fix complete.');
}

fixJo();
