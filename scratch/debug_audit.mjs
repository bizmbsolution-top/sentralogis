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

async function debugAudit() {
  const { data: wo, error: woErr } = await supabase.from('wo_items').select('id, status').limit(5);
  console.log('WO_ITEMS Sample:', wo, woErr);

  const { data: jo, error: joErr } = await supabase.from('job_orders').select('id, status').limit(5);
  console.log('JOB_ORDERS Sample:', jo, joErr);
  
  // Get all unique statuses
  const { data: allWo } = await supabase.from('wo_items').select('status');
  const uniqueWo = [...new Set(allWo?.map(s => s.status))];
  console.log('Unique WO Statuses:', uniqueWo);

  const { data: allJo } = await supabase.from('job_orders').select('status');
  const uniqueJo = [...new Set(allJo?.map(s => s.status))];
  console.log('Unique JO Statuses:', uniqueJo);
}

debugAudit();
