import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g'
);

const joId = '2819e21d-e0d6-4e6f-882c-24b320bf2438';

async function checkData() {
  const { data: jo } = await supabase
    .from('job_orders')
    .select('wo_item_id')
    .eq('id', joId)
    .single();

  if (!jo?.wo_item_id) {
    console.log('No wo_item_id for this JO');
    return;
  }

  const { data: woItem } = await supabase
    .from('wo_items')
    .select('*')
    .eq('id', jo.wo_item_id)
    .single();

  console.log('WO Item ID:', woItem.id);
  console.log('Item Data:', JSON.stringify(woItem.item_data, null, 2));
}

checkData();
