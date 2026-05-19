import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => { const [k,v] = l.split('='); if(k && v) env[k.trim()] = v.trim(); });

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function checkFleetType() {
  // Find B 9898 JJJ
  const { data: fleet } = await supabase
    .from('md_fleets')
    .select('id, plate_number, brand, model, status, fleet_type_id, md_fleet_types(type_name)')
    .eq('plate_number', 'B 9898 JJJ')
    .single();

  console.log('Fleet B 9898 JJJ:', JSON.stringify(fleet, null, 2));
  
  // Get all fleet types
  const { data: types } = await supabase
    .from('md_fleet_types')
    .select('id, type_name');
    
  console.log('\nAll Fleet Types:', types);
}

checkFleetType();