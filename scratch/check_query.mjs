import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data, error } = await supabase.from('job_orders').select(`
          id, jo_number, driver_id, fleet_id,
          md_drivers!fk_job_orders_md_driver(id, name, phone),
          md_fleets:fleet_id(id, plate_number)
`).limit(1);

console.log("Error:", error);
console.log("Data:", JSON.stringify(data, null, 2));
