import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkJO007AllCosts() {
  const { data: jo } = await supabase.from('job_orders').select('id').eq('jo_number', 'WO/05/2026/007-JO-001').single();
  if (jo) {
    const { data: costs } = await supabase.from('extra_costs').select('*').eq('jo_id', jo.id);
    console.log('All Costs for 007:', costs);
  }
}

checkJO007AllCosts();
