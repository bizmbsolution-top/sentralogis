import { createAdminClient } from '../lib/supabase/admin.js';

async function searchLocations() {
  const supabase = createAdminClient();
  const names = ['NPCT1 Port', 'TPS - PABRIK TPS JAKARTA', 'DEPO SIL'];
  
  console.log('Searching md_locations for names...');
  const { data, error } = await supabase
    .from('md_locations')
    .select('name, latitude, longitude')
    .in('name', names);

  if (error) console.error(error);
  else console.log('Results:', data);
}

searchLocations();
