import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key)).split('=')[1].trim();

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function debugAddresses() {
  const { data, error } = await supabase
    .from('md_entity_addresses')
    .select(`
      *,
      md_entities!inner(id, name, parent_id)
    `);
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('Total Addresses:', data.length);
    data.forEach(a => {
      console.log(`Address: ${a.address_name}, Entity: ${a.md_entities.name}, ParentID: ${a.md_entities.parent_id}`);
    });
  }
}

debugAddresses();
