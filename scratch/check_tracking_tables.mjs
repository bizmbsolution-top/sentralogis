import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const { data: t1 } = await supabase.from('job_tracking').select('*').limit(1);
  console.log('job_tracking:', t1 ? 'Exists' : 'Not found');

  const { data: t2 } = await supabase.from('job_tracking_logs').select('*').limit(1);
  console.log('job_tracking_logs:', t2 ? 'Exists' : 'Not found');
}

checkTables();
