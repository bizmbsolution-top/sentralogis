import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g'
);

const token = '2819e21d-e0d6-4e6f-882c-24b320bf2438';

async function checkData() {
  const { data: jo, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      tracking_token,
      job_routes!job_routes_job_order_id_fkey(*)
    `)
    .eq('tracking_token', token)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('JO ID:', jo.id);
  console.log('Routes Count:', jo.job_routes?.length);
  console.log('Routes Data:', JSON.stringify(jo.job_routes, null, 2));
}

checkData();
