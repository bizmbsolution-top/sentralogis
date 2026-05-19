import { createAdminClient } from '../lib/supabase/admin.js';

async function checkStatus() {
  const supabase = createAdminClient();
  const jo_number = 'WO/05/2026/006-JO-002';
  
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status')
    .eq('jo_number', jo_number)
    .single();

  if (error) console.error(error);
  else console.log('JO Status:', data);
}

checkStatus();
