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

async function getSync() {
  const { data } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_mission_status'"
  });
  process.stdout.write(data?.[0]?.pg_get_functiondef || 'Not found');
}

getSync();
