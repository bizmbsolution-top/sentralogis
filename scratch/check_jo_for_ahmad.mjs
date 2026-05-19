import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkJOs() {
  // Find SL-AHMAD-0526-001
  const { data: items } = await supabase
    .from('wo_items')
    .select('id, item_code, status')
    .ilike('item_code', '%SL-AHMAD-0526-001%');

  console.log('Items found:', items?.map(i => ({ id: i.id, item_code: i.item_code, status: i.status })));

  if (items && items.length > 0) {
    const itemId = items[0].id;
    console.log('Item ID:', itemId);
    
    // Get JOs
    const { data: jos } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, fleet_id, driver_id')
      .eq('wo_item_id', itemId);

    console.log('JOs found:', jos?.map(j => ({
      id: j.id,
      jo_number: j.jo_number,
      status: j.status,
      fleet_id: j.fleet_id,
      driver_id: j.driver_id
    })));
  }
}

checkJOs();