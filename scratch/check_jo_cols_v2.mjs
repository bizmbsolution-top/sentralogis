import { createClient } from '@supabase/supabase-client';
import { createAdminClient } from '../lib/supabase/admin.js';

async function checkColumns() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('job_orders').select('*').limit(1);
  if (error) {
    console.error(error);
    return;
  }
  const cols = Object.keys(data[0] || {});
  console.log("JOB_ORDERS_COLUMNS:" + JSON.stringify(cols));
}

checkColumns();
