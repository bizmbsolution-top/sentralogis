import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function checkColumns() {
  const { data, error } = await s.rpc('exec_sql_manual', { 
    sql_query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'" 
  });
  console.log('Columns in profiles:', data);
}

checkColumns();
