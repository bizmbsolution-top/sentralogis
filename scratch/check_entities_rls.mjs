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

async function checkRLS() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'md_entities'"
  });
  console.log('RLS Status:', data);
  
  const { data: policies } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'md_entities'"
  });
  console.log('RLS Policies:', policies);
}

checkRLS();
