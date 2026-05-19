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

async function checkCurrentBalances() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT name, tenant_code, token_balance FROM public.tenants ORDER BY token_balance DESC"
  });
  
  if (error) {
    console.error('Error fetching balances:', error);
  } else {
    console.log('--- CURRENT TENANT BALANCES ---');
    console.table(data);
  }
}

checkCurrentBalances();
