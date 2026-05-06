import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function fix() {
  console.log("Fixing WO/05/2026/002...");
  
  // 1. Update Item
  await supabase.from('wo_items').update({ status: 'completed' }).eq('item_code', 'WO/05/2026/002-ITM-01');
  
  // 2. Update WO
  await supabase.from('work_orders').update({ status: 'completed' }).eq('wo_number', 'WO/05/2026/002');
  
  console.log("Done fixing 002.");
}

fix();
