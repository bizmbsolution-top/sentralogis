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
  env['SUPABASE_SERVICE_ROLE_KEY']
);

async function checkAdmin() {
  console.log("Checking database as ADMIN...");
  
  const { data: jos } = await supabase
    .from('job_orders')
    .select('jo_number, status')
    .limit(10);
  
  console.log("ADMIN JO STATUS:", JSON.stringify(jos, null, 2));

  const { data: wos } = await supabase
    .from('work_orders')
    .select('wo_number, status')
    .limit(10);
  
  console.log("ADMIN WO STATUS:", JSON.stringify(wos, null, 2));
}

checkAdmin();
