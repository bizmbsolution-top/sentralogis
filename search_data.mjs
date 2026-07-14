import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const urls = [
  `${supabaseUrl}/rest/v1/job_orders?select=*,wo_item:wo_item_id(item_data,wo:work_orders(wo_type))&jo_number=ilike.*HALU-TAM-0626-002*`,
  `${supabaseUrl}/rest/v1/work_orders?select=*,wo_items(*)&wo_number=ilike.*HALU-TAM-0626-002*`
];

Promise.all(urls.map(url => fetch(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }).then(r => r.json())))
  .then(([jos, wos]) => {
    if (jos && jos.length > 0) {
      console.log("=== FOUND IN JOB ORDERS ===");
      const jo = jos[0];
      console.log("jo_number:", jo.jo_number);
      console.log("wo_type:", jo.wo_item?.wo?.wo_type);
      console.log("operation_type:", jo.wo_item?.item_data?.operation_type);
    } 
    
    if (wos && wos.length > 0) {
      console.log("=== FOUND IN WORK ORDERS ===");
      const wo = wos[0];
      console.log("wo_number:", wo.wo_number);
      console.log("wo_type:", wo.wo_type);
      if (wo.wo_items && wo.wo_items.length > 0) {
        console.log("operation_type:", wo.wo_items[0].item_data?.operation_type);
      }
    }
    
    if ((!jos || jos.length === 0) && (!wos || wos.length === 0)) {
      console.log("Not found in JO or WO using ilike");
    }
  });
