import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkWO() {
  // Find WO with SL-AHMAD-0526-001
  const { data: items } = await supabase
    .from('wo_items')
    .select('id, item_code, item_data, status')
    .ilike('item_code', '%SL-AHMAD-0526-001%');

  console.log('WO Items:', JSON.stringify(items, null, 2));
  
  if (items && items.length > 0) {
    const item = items[0];
    console.log('\nVehicle Type:', item.item_data?.vehicle_type_name);
    console.log('Unit Count:', item.item_data?.unit_count);
  }
}

checkWO();