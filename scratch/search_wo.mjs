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

async function searchWO() {
  const { data } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, wo_items(id, status, job_orders(id, status))')
    .ilike('wo_number', '%009%')
    .limit(5);
  
  console.log('Found WOs:', JSON.stringify(data, null, 2));
}

searchWO();
