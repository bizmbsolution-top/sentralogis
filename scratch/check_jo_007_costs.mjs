import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkJOAndCosts() {
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('id, jo_number, status, tenant_id')
    .eq('jo_number', 'WO/05/2026/007-JO-001')
    .single();
  
  if (joError) {
    console.error('JO Error:', joError);
    return;
  }
  console.log('JO Data:', jo);

  const { data: costs, error: costError } = await supabase
    .from('extra_costs')
    .select('*')
    .eq('jo_id', jo.id);
  
  if (costError) console.error('Cost Error:', costError);
  else console.log('Extra Costs:', costs);
}

checkJOAndCosts();
