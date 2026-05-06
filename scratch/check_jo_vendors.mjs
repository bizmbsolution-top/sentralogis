import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function run() {
  const { data, error } = await s.rpc('exec_sql_manual', { 
    sql_query: "SELECT jo_number, vendor_id, transporter_id FROM job_orders WHERE vendor_id IS NOT NULL OR transporter_id IS NOT NULL LIMIT 10" 
  });
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();
