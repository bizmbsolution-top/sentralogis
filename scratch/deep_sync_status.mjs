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

async function deepSync() {
  console.log("Starting Deep Intelligence Sync...");

  // 1. Fetch all non-completed WOs
  const { data: wos } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, wo_items(id, status, job_orders(id, status))')
    .not('status', 'eq', 'completed');

  if (!wos) return;

  for (const wo of wos) {
    let allItemsDone = true;
    
    for (const item of wo.wo_items) {
      const jos = item.job_orders || [];
      const allJosDone = jos.length > 0 && jos.every(j => j.status === 'completed');
      
      if (allJosDone && item.status !== 'completed') {
        console.log(`[${wo.wo_number}] Item ${item.id} is DONE. Updating status...`);
        await supabase.from('wo_items').update({ status: 'completed' }).eq('id', item.id);
      } else if (!allJosDone) {
        allItemsDone = false;
      }
    }

    if (allItemsDone && wo.wo_items.length > 0) {
      console.log(`[${wo.wo_number}] All items done. Moving WO to COMPLETED...`);
      await supabase.from('work_orders').update({ status: 'completed' }).eq('id', wo.id);
    }
  }

  console.log("Sync Complete.");
}

deepSync();
