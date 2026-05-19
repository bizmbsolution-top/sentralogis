import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkJODetails() {
  // Get item
  const { data: items } = await supabase
    .from('wo_items')
    .select('id, item_code, status, item_data')
    .ilike('item_code', '%SL-ATS-0526-001%');

  console.log('=== WO ITEM ===');
  console.log(items);

  if (items && items.length > 0) {
    const itemId = items[0].id;
    
    // Get job_orders - basic fields only
    const { data: jos } = await supabase
      .from('job_orders')
      .select('*')
      .eq('wo_item_id', itemId);

    console.log('\n=== JOB ORDERS (BASIC) ===');
    console.log(JSON.stringify(jos, null, 2));
    
    // Get driver details
    const driverIds = jos?.map(j => j.driver_id).filter(Boolean) || [];
    if (driverIds.length > 0) {
      const { data: drivers } = await supabase
        .from('md_drivers')
        .select('id, name, phone')
        .in('id', driverIds);
      
      console.log('\n=== DRIVERS ===');
      console.log(JSON.stringify(drivers, null, 2));
    }
    
    // Get fleet details
    const fleetIds = jos?.map(j => j.fleet_id).filter(Boolean) || [];
    if (fleetIds.length > 0) {
      const { data: fleets } = await supabase
        .from('md_fleets')
        .select('id, plate_number, brand, model, status')
        .in('id', fleetIds);
      
      console.log('\n=== FLEETS ===');
      console.log(JSON.stringify(fleets, null, 2));
    }
  }
}

checkJODetails();