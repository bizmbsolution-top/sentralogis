import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCycle() {
  const joId = '2819e21d-e0d6-4e6f-882c-24b320bf2438';
  
  console.log('Inserting...');
  const { data: insData, error: insError } = await supabase.from('job_routes').insert({
    job_order_id: joId,
    sequence: 99,
    stop_type: 'PICKUP',
    source_type: 'MD_LOCATION',
    source_id: 'LEGACY',
    location_name: 'TEST_CYCLE',
    address: 'TEST_CYCLE',
    status: 'pending'
  }).select();
  
  if (insError) {
    console.error('Insert Error:', insError);
    return;
  }
  console.log('Inserted:', insData);

  console.log('Fetching...');
  const { data: fetchData, error: fetchError } = await supabase.from('job_routes').select('*').eq('job_order_id', joId);
  if (fetchError) console.error('Fetch Error:', fetchError);
  else console.log('Fetched:', fetchData.length, 'records');
}

testCycle();
