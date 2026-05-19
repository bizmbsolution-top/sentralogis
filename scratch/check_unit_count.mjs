import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnitCount() {
  const { data: item } = await supabase
    .from('wo_items')
    .select('id, item_code, item_data')
    .eq('item_code', 'WO/05/2026/007-ITM-01')
    .single();

  if (item) {
    const itemData = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {});
    console.log(`Item: ${item.item_code} | unit_count: ${itemData.unit_count}`);
    
    const { data: jos } = await supabase
      .from('job_orders')
      .select('jo_number')
      .eq('wo_item_id', item.id);
    
    console.log(`Found ${jos?.length || 0} Job Orders.`);
  }
}

checkUnitCount();
