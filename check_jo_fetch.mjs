import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const url = `${supabaseUrl}/rest/v1/job_orders?select=*,wo_item:wo_item_id(item_data,wo:work_orders(wo_type))&jo_number=eq.HALU-TAM-0626-002`;

fetch(url, { 
  headers: { 
    apikey: supabaseKey, 
    Authorization: `Bearer ${supabaseKey}` 
  }
})
  .then(r => r.json())
  .then(data => {
    if (data && data.length > 0) {
      const jo = data[0];
      console.log("=== JOB ORDER ===");
      console.log("jo_number:", jo.jo_number);
      console.log("wo_type:", jo.wo_item?.wo?.wo_type);
      console.log("operation_type (from item_data):", jo.wo_item?.item_data?.operation_type);
      console.log("task_type (from item_data):", jo.wo_item?.item_data?.task_type);
      console.log("Full item_data:", JSON.stringify(jo.wo_item?.item_data, null, 2));
    } else {
      console.log("JO not found");
    }
  })
  .catch(console.error);
