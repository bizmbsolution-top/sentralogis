import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Workaround for websocket issue
import ws from 'ws';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

async function test() {
  const { data: woItemsData } = await supabase
    .from('wo_items')
    .select('id, item_code, item_data, sbu_type, work_orders(wo_number), wo_item_manifests(id, quantity, md_product_skus(name)), job_orders(id, jo_number, wo_item_manifests(id, quantity, md_product_skus(name)))')
    .or('item_code.ilike.%HALU-TAM-0626-001%')
    .limit(5);

  const { data: woData2 } = await supabase
    .from('work_orders')
    .select('id, wo_number, wo_items(id, item_code, wo_item_manifests(id, quantity))')
    .ilike('wo_number', '%HALU-TAM-0626-001%');

  console.log("WO Items Data:", JSON.stringify(woItemsData, null, 2));
  console.log("WO Data 2:", JSON.stringify(woData2, null, 2));
}

test();
