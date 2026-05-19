import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587';
  console.log('Testing query with tenant_id:', tenantId);
  
  const { data, error } = await supabase
    .from('extra_costs')
    .select(`
      *,
      job_orders!jo_id!inner(id, jo_number, tenant_id)
    `)
    .neq('status', 'draft')
    .eq('job_orders.tenant_id', tenantId)
    .limit(5);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success! Count:', data.length);
    if (data.length > 0) {
        console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    }
  }
}

testQuery();
