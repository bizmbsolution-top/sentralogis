import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length > 0) vars[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'md_entities'"
  });
  console.log('RPCs:', data);
  console.log('Error:', error);
}

check();
