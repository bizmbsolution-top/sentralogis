import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const urls = [
  `${supabaseUrl}/rest/v1/job_orders?select=*,wo_item:wo_item_id(item_data,wo:work_orders(wo_type))&jo_number=ilike.*0626-002*`,
  `${supabaseUrl}/rest/v1/work_orders?select=*,wo_items(*)&wo_number=ilike.*0626-002*`,
  `${supabaseUrl}/rest/v1/wo_items?select=*,wo:work_orders(wo_type)&item_code=ilike.*0626-002*`
];

Promise.all(urls.map(url => fetch(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }).then(r => r.json())))
  .then(([jos, wos, items]) => {
    let found = false;

    if (jos && jos.length > 0) {
      console.log("=== FOUND IN JOB ORDERS ===");
      const jo = jos[0];
      console.log("jo_number:", jo.jo_number);
      console.log("wo_type:", jo.wo_item?.wo?.wo_type);
      console.log("operation_type:", jo.wo_item?.item_data?.operation_type);
      found = true;
    } 
    
    if (wos && wos.length > 0) {
      console.log("=== FOUND IN WORK ORDERS ===");
      const wo = wos[0];
      console.log("wo_number:", wo.wo_number);
      console.log("wo_type:", wo.wo_type);
      if (wo.wo_items && wo.wo_items.length > 0) {
        console.log("operation_type:", wo.wo_items[0].item_data?.operation_type);
      }
      found = true;
    }

    if (items && items.length > 0) {
      console.log("=== FOUND IN WO ITEMS ===");
      const item = items[0];
      console.log("item_code:", item.item_code);
      console.log("wo_type:", item.wo?.wo_type);
      console.log("operation_type:", item.item_data?.operation_type);
      console.log("task_type:", item.item_data?.task_type);
      console.log("sbu_type:", item.sbu_type);
      found = true;
    }
    
    if (!found) {
      console.log("Not found anywhere using ilike *0626-002*");
    }
  }).catch(console.error);
