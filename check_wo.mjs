import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: woData, error: woError } = await supabase
    .from('work_orders')
    .select('*, wo_items(*)')
    .eq('wo_number', 'HALU-TAM-0626-002')
    .single();

  if (woError) {
    console.error("Error fetching WO:", woError);
  } else {
    console.log("=== WORK ORDER ===");
    console.log("wo_type:", woData.wo_type);
    
    console.log("\n=== WO ITEMS ===");
    woData.wo_items.forEach((item, idx) => {
      console.log(`\nItem #${idx + 1}:`);
      console.log("operation_type (from item_data):", item.item_data?.operation_type);
      console.log("task_type (from item_data):", item.item_data?.task_type);
      console.log("Full item_data:", JSON.stringify(item.item_data, null, 2));
    });
  }
}

check();
