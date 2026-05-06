import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function checkDb() {
  const { data, error } = await s.rpc('exec_sql_manual', { 
    sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('extra_costs', 'finance_coa', 'finance_journals', 'finance_journal_entries')" 
  });
  console.log('Tables:', data);
  console.log('Error:', error);
}

checkDb();
