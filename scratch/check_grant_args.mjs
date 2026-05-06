import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function check() {
  const { data, error } = await s.rpc('exec_sql_manual', { 
    sql_query: "SELECT pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'grant_tokens_to_tenant'" 
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

check();
