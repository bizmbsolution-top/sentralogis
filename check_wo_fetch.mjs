import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/work_orders?select=*,wo_items(*)&wo_number=eq.HALU-TAM-0626-002`;

fetch(url, { 
  headers: { 
    apikey: supabaseKey, 
    Authorization: `Bearer ${supabaseKey}` 
  }
})
  .then(r => r.json())
  .then(data => {
    if (data && data.length > 0) {
      const wo = data[0];
      console.log("=== WORK ORDER ===");
      console.log("wo_type:", wo.wo_type);
      console.log("\n=== WO ITEMS ===");
      wo.wo_items.forEach((item, idx) => {
        console.log(`\nItem #${idx + 1}:`);
        console.log("operation_type (from item_data):", item.item_data?.operation_type);
        console.log("task_type (from item_data):", item.item_data?.task_type);
        console.log("Full item_data:", JSON.stringify(item.item_data, null, 2));
      });
    } else {
      console.log("WO not found");
    }
  })
  .catch(console.error);
