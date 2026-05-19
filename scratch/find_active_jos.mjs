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

async function findActiveWithRoutes() {
  const { data: jos } = await supabase
    .from('job_orders')
    .select('id, jo_number, status')
    .eq('driver_response', 'accepted')
    .not('status', 'in', '("completed","done","rejected","cancelled","PEKERJAAN SELESAI","verified","ready_for_billing","awaiting_audit","delivered","pod_uploaded")');

  console.log('Active JOs:', jos?.length);

  for (const jo of (jos || [])) {
    const { data: routes } = await supabase
      .from('job_routes')
      .select('*')
      .eq('job_order_id', jo.id);
    
    if (routes && routes.length > 0) {
      console.log(`JO ${jo.jo_number} (status: ${jo.status}) has ${routes.length} routes.`);
    }
  }
}

findActiveWithRoutes();
