import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: row, error } = await supabase.from('extra_costs').select('*').limit(1).single();
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Extra Costs Columns:', Object.keys(row));
  
  const { data: jo, error: joError } = await supabase.from('job_orders').select('*').eq('jo_number', 'WO/05/2026/006-JO-002').single();
  if (joError) console.error('JO Error:', joError);
  else console.log('JO Tenant ID:', jo.tenant_id);
}

checkSchema();
