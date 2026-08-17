import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, status, jo_number, driver_id, md_drivers(name)')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(data, null, 2));
}
run();
