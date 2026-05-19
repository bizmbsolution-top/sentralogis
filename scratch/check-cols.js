import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'job_orders' }).catch(() => ({}));
  if (error || !data) {
    const { data: d2 } = await supabase.from('job_orders').select('*').limit(1);
    console.log("job_orders cols:", d2 ? Object.keys(d2[0]) : null);
    
    const { data: d3 } = await supabase.from('extra_costs').select('*').limit(1);
    console.log("extra_costs cols:", d3 ? Object.keys(d3[0]) : null);
  }
}
run();
