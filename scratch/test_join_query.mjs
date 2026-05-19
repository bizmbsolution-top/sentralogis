import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key)).split('=')[1].trim();

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function testQuery() {
  const { data, error } = await supabase
    .from('md_entity_addresses')
    .select(`
      *,
      md_entities!inner(id, name, phone, tenant_id, is_customer, parent_id)
    `)
    .limit(1);
    
  if (error) {
    console.error('QUERY ERROR:', error);
  } else {
    console.log('QUERY SUCCESS:', data);
  }
}

testQuery();
