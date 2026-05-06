import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function run() {
  const { data: t1 } = await s.rpc('exec_sql_manual', { sql_query: "SELECT count(*) FROM fleets" });
  const { data: t2 } = await s.rpc('exec_sql_manual', { sql_query: "SELECT count(*) FROM md_fleets" });
  const { data: t3 } = await s.rpc('exec_sql_manual', { sql_query: "SELECT count(*) FROM drivers" });
  const { data: t4 } = await s.rpc('exec_sql_manual', { sql_query: "SELECT count(*) FROM md_drivers" });
  console.log({fleets: t1, md_fleets: t2, drivers: t3, md_drivers: t4});
}
run();
