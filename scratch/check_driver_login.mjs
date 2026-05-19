import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length > 0) vars[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function checkDrivers() {
  console.log('Checking md_drivers data...');
  const { data, error } = await supabase
    .from('md_drivers')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching drivers:', error);
  } else {
    console.table(data);
    if (data.length === 0) {
      console.log('No drivers found in md_drivers table.');
    } else if (!data[0].pin) {
      console.log('WARNING: First driver has NO PIN set.');
    }
  }
}

checkDrivers();
