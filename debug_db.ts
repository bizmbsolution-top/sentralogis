import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log("Checking Job Orders...");
  const { data: jobOrders, error } = await supabase
    .from('job_orders')
    .select(`
      id, jo_number, status, created_at, wo_item_id,
      wo_items!inner (
        id, sbu_type, item_data
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error querying job_orders:", error);
  } else {
    console.log("Latest Job Orders:", JSON.stringify(jobOrders, null, 2));
  }
}

checkDatabase();
