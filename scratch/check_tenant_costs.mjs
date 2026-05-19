import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkTenantCosts() {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587';
  const { data: jos } = await supabase.from('job_orders').select('id, jo_number').eq('tenant_id', tenantId);
  if (jos) {
    const joIds = jos.map(j => j.id);
    const { data: costs } = await supabase.from('extra_costs').select('*').in('jo_id', joIds);
    console.log('All Tenant Costs:', costs.map(c => ({
      jo: jos.find(j => j.id === c.jo_id)?.jo_number,
      status: c.status
    })));
  }
}

checkTenantCosts();
