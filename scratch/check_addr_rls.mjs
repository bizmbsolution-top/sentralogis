import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
  }, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAddrRLS() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'md_entity_addresses'"
  });
  if (error) console.error(error);
  console.log('RLS Policies on md_entity_addresses:', data);
}

checkAddrRLS();
