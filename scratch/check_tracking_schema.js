import { createAdminClient } from './lib/supabase/admin.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('job_tracking').select('*').limit(1);
  if (error) console.error(error);
  else console.log('job_tracking sample:', data);
}
checkSchema();
