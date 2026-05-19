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

async function checkWO009() {
  const { data: wo } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, wo_items(id, status, job_orders(id, status))')
    .eq('wo_number', 'WO/05/2026/009')
    .single();
  
  console.log('WO 009 Details:', JSON.stringify(wo, null, 2));
}

checkWO009();
