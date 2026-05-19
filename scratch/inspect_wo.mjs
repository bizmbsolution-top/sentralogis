import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'; // SERVICE ROLE KEY
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectWO() {
  const { data: wos, error: woError } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, tenant_id')
    .ilike('wo_number', '%007%')
    .limit(1);

  if (woError) {
    console.error('Error fetching WOs:', woError);
    return;
  }

  if (!wos || wos.length === 0) {
    console.log('WO 007 not found even with service role.');
    return;
  }

  const wo = wos[0];
  console.log('Found WO:', wo.wo_number, 'ID:', wo.id, 'Tenant:', wo.tenant_id);

  const { data: items, error: itemsError } = await supabase
    .from('wo_items')
    .select('*')
    .eq('wo_id', wo.id);

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    return;
  }

  console.log('Items found:', items.length);
  items.forEach(itm => {
    console.log(`- ${itm.item_code} (ID: ${itm.id}) - Status: ${itm.status}`);
    console.log(`  Data:`, itm.item_data);
  });
}

inspectWO();
