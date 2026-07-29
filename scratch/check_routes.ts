import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: jo, error: joErr } = await supabase.from('job_orders').select('id, jo_number, status').eq('token', 'qa6zrftt4ab').single();
  if (joErr) {
    console.log('JO error:', joErr);
    return;
  }
  console.log('JO:', jo);

  const { data: routes, error: routeErr } = await supabase.from('job_routes').select('sequence, location_name, status, latitude, longitude').eq('job_order_id', jo.id).order('sequence');
  if (routeErr) {
    console.log('Route error:', routeErr);
    return;
  }
  console.log('Routes:');
  console.table(routes);
}

main();
