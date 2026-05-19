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

async function listAllJOs() {
  const { data: jos } = await supabase
    .from('job_orders')
    .select('jo_number, status, driver_response')
    .order('created_at', { ascending: false })
    .limit(10);

  console.table(jos);
}

listAllJOs();
