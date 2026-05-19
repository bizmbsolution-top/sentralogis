
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItems() {
  const { data, error } = await supabase
    .from('wo_items')
    .select('id, item_code, status, item_data, job_orders(id, fleet_id, driver_id, wa_link_sent_at, driver_response)')
    .in('item_code', ['SL-TAM-0526-001/TR01', 'WO/05/2026/009-ITM-01']);

  if (error) {
    console.error(error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

checkItems();
