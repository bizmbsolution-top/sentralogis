import { supabase } from '../lib/supabaseClient.ts';

async function test() {
  const { data, error } = await supabase
    .from('job_tracking')
    .select('*, job_orders!job_order_id(jo_number, md_fleets(plate_number))')
    .limit(5);
  
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("DATA:", JSON.stringify(data, null, 2));
  }
}

test();
