import { createAdminClient } from '../lib/supabase/admin.js';

async function debugWO() {
  const supabase = createAdminClient();
  const itemCode = 'WO/05/2026/006-ITM-01';
  
  const { data: item } = await supabase
    .from('wo_items')
    .select('id, item_code, unit_count, status')
    .eq('item_code', itemCode)
    .single();
    
  if (!item) {
    console.log("Item NOT FOUND");
    return;
  }
  
  console.log("ITEM_DATA:" + JSON.stringify(item));
  
  const { data: jos } = await supabase
    .from('job_orders')
    .select('id, jo_number, transporter_id, driver_id, fleet_id, status')
    .eq('wo_item_id', item.id);
    
  console.log("JOB_ORDERS:" + JSON.stringify(jos || []));
}

debugWO();
