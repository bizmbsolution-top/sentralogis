import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocs() {
  const joId = '3c962c20-2ebd-4f1c-ac13-af7d29eed155';
  const { data: jo } = await supabase.from('job_orders').select('*, wo_item:wo_items(item_data)').eq('id', joId).single();
  console.log("JO item_data:", jo?.wo_item?.item_data);
  
  const whId = jo?.wo_item?.item_data?.warehouse_id || jo?.wo_item?.item_data?.destination_location_id;
  console.log("WH ID:", whId);

  const { data: locs } = await supabase.from('md_warehouse_locations').select('*').eq('warehouse_id', whId);
  console.log("Locations for WH:", locs);
  
  const { data: wh } = await supabase.from('md_warehouses').select('*').eq('id', whId);
  console.log("Warehouse DB info:", wh);
}
checkLocs();
