import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkPendingCosts() {
  const { data: costs, error: costError } = await supabase
    .from('extra_costs')
    .select('*')
    .eq('status', 'need_approval');
  
  if (costError) {
    console.error(costError);
    return;
  }
  
  if (costs.length === 0) {
    console.log('No pending costs found in extra_costs.');
    return;
  }

  const joIds = costs.map(c => c.jo_id);
  const { data: jos, error: joError } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .in('id', joIds);
  
  if (joError) console.error(joError);
  else {
    const mapped = costs.map(c => ({
      ...c,
      jo_number: jos.find(j => j.id === c.jo_id)?.jo_number
    }));
    console.log('Pending Costs with JO:', mapped);
  }
}

checkPendingCosts();
