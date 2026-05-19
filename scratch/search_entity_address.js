import { createAdminClient } from '../lib/supabase/admin.js';

async function searchEntityAddress() {
  const supabase = createAdminClient();
  
  console.log('Searching md_entity_addresses for TPS...');
  const { data, error } = await supabase
    .from('md_entity_addresses')
    .select('address_name, latitude, longitude, address')
    .ilike('address_name', '%TAM%');

  if (error) console.error(error);
  else console.log('Results:', data);
}

searchEntityAddress();
