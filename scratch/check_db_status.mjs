import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function check() {
  const { data } = await supabase
    .from('job_orders')
    .select('jo_number, status')
    .ilike('jo_number', '%WO/05/2026/002%');
  
  console.log("JO STATUS:", JSON.stringify(data, null, 2));
  
  const { data: wo } = await supabase
    .from('work_orders')
    .select('wo_number, status')
    .ilike('wo_number', '%002%');
  
  console.log("WO STATUS:", JSON.stringify(wo, null, 2));
}

check();
