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

async function checkFleet() {
  const woNum = 'WO/05/2026/002';
  console.log(`Checking fleet for ${woNum}...`);
  
  const { data: wo } = await supabase.from('work_orders').select('id').eq('wo_number', woNum).single();
  if (!wo) return;

  const { data: items } = await supabase.from('wo_items').select('id').eq('wo_id', wo.id);
  const itemIds = items.map(i => i.id);

  const { data: jos } = await supabase
    .from('job_orders')
    .select('jo_number, status')
    .in('wo_item_id', itemIds);
  
  console.log(`JO List for ${woNum}:`, JSON.stringify(jos, null, 2));
}

checkFleet();
