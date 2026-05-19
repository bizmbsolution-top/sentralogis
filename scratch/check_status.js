import { createAdminClient } from '../lib/supabase/admin.js';

async function checkStatus() {
  const supabase = createAdminClient();
  const token = 'f771bda3-9a55-4cfc-8f49-25d823f38bc6';

  console.log(`Checking status for token: ${token}`);

  // 1. Get Job Order
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('id, jo_number, status, wo_item_id, driver_response')
    .eq('tracking_token', token)
    .single();

  if (joError) {
    console.error('Error fetching JO:', joError);
    return;
  }

  console.log('--- Job Order ---');
  console.log(`JO Number: ${jo.jo_number}`);
  console.log(`JO Status: ${jo.status}`);
  console.log(`Driver Response: ${jo.driver_response}`);

  // 2. Get WO Item
  if (jo.wo_item_id) {
    const { data: item, error: itemError } = await supabase
      .from('wo_items')
      .select('id, item_code, status, wo_id')
      .eq('id', jo.wo_item_id)
      .single();

    if (itemError) {
      console.error('Error fetching WO Item:', itemError);
    } else {
      console.log('--- WO Item ---');
      console.log(`Item Code: ${item.item_code}`);
      console.log(`Item Status: ${item.status}`);

      // 3. Get Work Order
      if (item.wo_id) {
        const { data: wo, error: woError } = await supabase
          .from('work_orders')
          .select('id, wo_number, status')
          .eq('id', item.wo_id)
          .single();

        if (woError) {
          console.error('Error fetching Work Order:', woError);
        } else {
          console.log('--- Work Order ---');
          console.log(`WO Number: ${wo.wo_number}`);
          console.log(`WO Status: ${wo.status}`);
        }
      }
    }
  }
}

checkStatus();
