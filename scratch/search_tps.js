import { createAdminClient } from '../lib/supabase/admin.js';

async function searchTPS() {
  const supabase = createAdminClient();
  
  console.log('Searching md_locations for TPS...');
  const { data, error } = await supabase
    .from('md_locations')
    .select('name, latitude, longitude')
    .ilike('name', '%TPS%');

  if (error) console.error(error);
  else console.log('Results:', data);
}

searchTPS();
