import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkFleet() {
  // Search for fleet - try different searches
  console.log('Searching for FLT/007...');
  
  // Try by exact code/prefix
  const { data: fleets1 } = await supabase
    .from('md_fleets')
    .select('id, plate_number, brand, model, status, entity_id, md_fleet_types(type_name)')
    .ilike('plate_number', '%007%')
    .limit(20);

  console.log('Fleets with 007:', JSON.stringify(fleets1, null, 2));
  
  // Get all recent fleets
  const { data: fleets2 } = await supabase
    .from('md_fleets')
    .select('id, plate_number, status')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Recent fleets:', JSON.stringify(fleets2, null, 2));
}

checkFleet();