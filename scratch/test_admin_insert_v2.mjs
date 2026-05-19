import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
  const { data, error } = await supabase.from('job_routes').insert({
    job_order_id: '2819e21d-e0d6-4e6f-882c-24b320bf2438',
    sequence: 1,
    stop_type: 'PICKUP',
    source_type: 'MD_LOCATION',
    source_id: 'LEGACY',
    location_name: 'TAM - GUDANG TAM 1',
    address: 'Jl. Raya Grogol No. 1',
    status: 'pending'
  }).select();
  
  if (error) console.error('Insert Error:', error);
  else console.log('Insert Success:', data);
}

testInsert();
