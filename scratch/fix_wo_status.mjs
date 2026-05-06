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

async function fixStatus() {
  const woNumber = 'WO/05/2026/002';
  console.log(`Checking status for ${woNumber}...`);

  const { data: wo } = await supabase
    .from('work_orders')
    .select('id, status, wo_items(id, status, job_orders(id, status))')
    .eq('wo_number', woNumber)
    .single();

  if (!wo) {
    console.log("WO not found");
    return;
  }

  console.log("Current WO Status:", wo.status);
  
  let allItemsDone = true;
  for (const item of wo.wo_items) {
    const allJosDone = item.job_orders.length > 0 && item.job_orders.every(j => j.status === 'completed');
    console.log(`Item ${item.id}: JO count: ${item.job_orders.length}, All JOs done? ${allJosDone}`);
    
    if (allJosDone && item.status !== 'completed') {
      console.log(`Updating Item ${item.id} to completed...`);
      await supabase.from('wo_items').update({ status: 'completed' }).eq('id', item.id);
    } else if (!allJosDone) {
      allItemsDone = false;
    }
  }

  if (allItemsDone && wo.status !== 'completed') {
    console.log(`Updating WO ${wo.id} to completed...`);
    const { error } = await supabase.from('work_orders').update({ status: 'completed' }).eq('id', wo.id);
    if (error) console.error("Error updating WO:", error);
    else console.log("WO successfully updated to COMPLETED!");
  } else {
    console.log(`WO ${woNumber} result: allItemsDone=${allItemsDone}, currentStatus=${wo.status}`);
  }
}

fixStatus();
