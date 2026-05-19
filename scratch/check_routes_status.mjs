import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkRoutes() {
  const { data: jo } = await supabase.from('job_orders').select('id').eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001').single();
  const { data, error } = await supabase.from('job_routes').select('*').eq('job_order_id', jo.id).order('sequence');
  if (error) console.error(error);
  else console.table(data);
}

checkRoutes();
