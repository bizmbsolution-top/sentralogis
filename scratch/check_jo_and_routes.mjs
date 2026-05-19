import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkJoAndRoutes() {
  const { data: jo, error: joError } = await supabase.from('job_orders').select('id, jo_number').eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001').single();
  if (joError) {
    console.error('JO Error:', joError);
    return;
  }
  console.log('JO Found:', jo);
  
  const { data: routes, error: rError } = await supabase.from('job_routes').select('id, sequence, location_name, status').eq('job_order_id', jo.id).order('sequence');
  if (rError) {
    console.error('Routes Error:', rError);
    return;
  }
  console.log('Routes Found:', routes.length);
  console.log(routes);
}

checkJoAndRoutes();
