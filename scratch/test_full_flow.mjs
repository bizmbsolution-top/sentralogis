import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFullFlow() {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587';
  console.log('Testing flow for tenant:', tenantId);

  // 1. Fetch JO IDs
  const { data: tenantJos, error: joIdError } = await supabase
    .from('job_orders')
    .select('id')
    .eq('tenant_id', tenantId);

  if (joIdError) return console.error('JO Fetch Error:', joIdError);
  const tenantJoIds = tenantJos.map(j => j.id);
  console.log('Found', tenantJoIds.length, 'JOs');

  // 2. Fetch extra costs
  const { data: costs, error: costsError } = await supabase
    .from('extra_costs')
    .select('*')
    .neq('status', 'draft')
    .in('jo_id', tenantJoIds)
    .limit(5);

  if (costsError) return console.error('Costs Fetch Error:', costsError);
  console.log('Found', costs.length, 'Costs');
  
  if (costs.length > 0) {
      console.log('Sample Cost:', costs[0]);
  }
}

testFullFlow();
