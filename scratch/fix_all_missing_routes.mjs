import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixAllMissingRoutes() {
  // 1. Ambil semua JO aktif
  const { data: jos, error: joError } = await supabase
    .from('job_orders')
    .select(`
      id, jo_number, status,
      wo_item:wo_items!wo_item_id (
        id, item_data
      )
    `)
    .not('status', 'in', '("completed", "PEKERJAAN SELESAI", "ready_for_billing", "verified", "cancelled", "draft")');

  if (joError) {
    console.error('JO Error:', joError);
    return;
  }

  console.log(`Checking ${jos.length} active JOs...`);

  for (const jo of jos) {
    const { data: routes } = await supabase.from('job_routes').select('id').eq('job_order_id', jo.id);
    
    if (!routes || routes.length === 0) {
      console.log(`JO ${jo.jo_number} has 0 routes. Self-healing...`);
      const stops = jo.wo_item?.item_data?.stops || [];
      if (stops.length > 0) {
        const routePayloads = stops.map((stop, idx) => ({
          job_order_id: jo.id,
          sequence: idx + 1,
          stop_type: stop.stop_type || (idx === 0 ? 'PICKUP' : 'DROPOFF'),
          source_type: 'MD_LOCATION',
          source_id: 'LEGACY',
          location_name: stop.location_name || '-',
          address: stop.address || '-',
          contact_name: stop.contact_name || '-',
          contact_phone: stop.contact_phone || '-',
          status: 'pending'
        }));
        
        const { error: insError } = await supabase.from('job_routes').insert(routePayloads);
        if (insError) console.error(`Failed to insert routes for ${jo.jo_number}`, insError);
        else console.log(`Successfully inserted ${stops.length} routes for ${jo.jo_number}`);
      }
    }
  }
}

fixAllMissingRoutes();
