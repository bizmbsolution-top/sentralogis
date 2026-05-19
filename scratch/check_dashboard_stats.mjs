import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587'; // HALU

const { data: jos } = await supabase.from('job_orders')
    .select('id, status, driver_id, fleet_id, driver_response, wo_item:wo_items!wo_item_id(sbu_type)')
    .eq('tenant_id', tenantId);

const truckingJOs = jos?.filter(j => j.wo_item?.sbu_type === 'TRUCKING') || [];

console.log("Trucking JOs grouped by status, driver_id, fleet_id, driver_response:");
for (const j of truckingJOs) {
    console.log(` - ID: ${j.id}, Status: ${j.status}, Driver: ${j.driver_id}, Fleet: ${j.fleet_id}, Resp: ${j.driver_response}`);
}
