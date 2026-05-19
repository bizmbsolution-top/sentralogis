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

async function checkJORoutes() {
  const { data: jo } = await supabase
    .from('job_orders')
    .select('id')
    .eq('jo_number', 'WO/05/2026/006-JO-002')
    .maybeSingle();

  if (jo) {
    const { data: routes } = await supabase
      .from('job_routes')
      .select('*')
      .eq('job_order_id', jo.id);
    console.log('Routes for JO:', routes);
  } else {
    console.log('JO not found');
  }
}

checkJORoutes();
