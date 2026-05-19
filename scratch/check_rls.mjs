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

async function checkRLS() {
  const { data: jos } = await supabase.from('job_orders').select('wo_item_id').limit(1);
  if (jos && jos.length > 0) {
    const { data: wo, error } = await supabase.from('wo_items').select('*').eq('id', jos[0].wo_item_id);
    console.log('Lookup by ID:', wo, error);
  }
}

checkRLS();
