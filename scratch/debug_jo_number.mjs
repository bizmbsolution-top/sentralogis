import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g'
);

const joNumber = 'SL-TAM-0526-002/TR01/OWN-001';

async function checkData() {
  const { data: jo, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      tracking_token,
      jo_number,
      job_routes!job_routes_job_order_id_fkey(*)
    `)
    .eq('jo_number', joNumber)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('JO ID:', jo.id);
  console.log('Tracking Token:', jo.tracking_token);
  console.log('JO Number:', jo.jo_number);
  console.log('Routes Count:', jo.job_routes?.length);
}

checkData();
