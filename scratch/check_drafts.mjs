import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDrafts() {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587';

  const { data: wos } = await supabase
    .from('work_orders')
    .select('wo_number, status')
    .eq('tenant_id', tenantId);

  console.log('Work Orders Status:');
  wos?.forEach(wo => console.log(`- ${wo.wo_number}: ${wo.status}`));
}

checkDrafts();
