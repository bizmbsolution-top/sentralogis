import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length > 0) vars[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Testing query...');
  const { data, error } = await supabase
    .from('md_fleets')
    .select(`
      plate_number,
      status,
      md_entities!inner (
        name,
        is_vendor
      )
    `)
    .eq('status', 'available')
    .eq('md_entities.is_vendor', false);

  if (error) {
    console.error('Query Failed:', error);
  } else {
    console.log('Results:', data);
  }
}

test();
