import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataConsistency() {
  const { data: items, error: itemsError } = await supabase
    .from('wo_items')
    .select('id, item_code, status, tenant_id, work_orders(wo_number)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (itemsError) {
    console.error('Error fetching wo_items:', itemsError);
    return;
  }

  console.log('Latest WO Items:');
  for (const item of items) {
    const { data: jos, error: josError } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, tenant_id')
      .eq('wo_item_id', item.id);
    
    console.log(`\nItem: ${item.item_code} (${item.id}) | WO: ${item.work_orders?.wo_number} | Status: ${item.status}`);
    console.log(`Tenant ID: ${item.tenant_id}`);
    if (jos && jos.length > 0) {
      console.log('  Job Orders:');
      jos.forEach(jo => console.log(`    - ${jo.jo_number} (${jo.id}) | Status: ${jo.status} | Tenant: ${jo.tenant_id}`));
    } else {
      console.log('  No Job Orders found.');
    }
  }
}

checkDataConsistency();
