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

const [josRes, itemsRes] = await Promise.all([
    supabase.from('job_orders')
        .select('id, status, created_at, completed_at, wo_item:wo_items!wo_item_id(sbu_type)')
        .eq('tenant_id', tenantId),
    supabase.from('wo_items')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId)
        .eq('sbu_type', 'TRUCKING')
]);

const jos = (josRes.data || []).filter(j => j.wo_item?.sbu_type === 'TRUCKING');
const items = itemsRes.data || [];

console.log("Total wo_items (Trucking Requests):", items.length);
console.log("Total job_orders (Trucking Fulfillments):", jos.length);

console.log("\nwo_items created_at list:");
items.forEach(i => console.log(` - ID: ${i.id}, Created: ${i.created_at}, Status: ${i.status}`));

console.log("\njob_orders completed_at & created_at list:");
jos.forEach(j => console.log(` - ID: ${j.id}, Created: ${j.created_at}, Completed: ${j.completed_at}, Status: ${j.status}`));
