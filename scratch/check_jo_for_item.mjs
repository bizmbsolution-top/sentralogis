import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkJOs() {
  // Find the item first
  const { data: items } = await supabase
    .from('wo_items')
    .select('id, item_code, status, item_data')
    .ilike('item_code', '%SL-ATS-0526-001%');

  console.log("Items found:", items?.map(i => ({
    id: i.id,
    item_code: i.item_code,
    status: i.status,
    unit_count: i.item_data?.unit_count
  })) || []);

  if (items && items.length > 0) {
    const itemId = items[0].id;
    
    // Get job_orders for this item
    const { data: jos } = await supabase
      .from('job_orders')
      .select('*')
      .eq('wo_item_id', itemId);

    console.log("Job Orders for this item:", jos?.map(j => ({
      id: j.id,
      jo_number: j.jo_number,
      status: j.status,
      driver_id: j.driver_id,
      fleet_id: j.fleet_id,
      wo_item_id: j.wo_item_id
    })) || []);
  }
}

checkJOs();