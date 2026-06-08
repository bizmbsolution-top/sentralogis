require('dotenv').config({ path: '.env.local' });
global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkJO() {
  const joNumber = 'HALU-TAM-0626-001/WH01-01';
  
  // Find the Job Order
  const { data: jo, error: joErr } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .eq('jo_number', joNumber)
    .single();

  if (joErr || !jo) {
    console.log('JO Not Found:', joErr);
    return;
  }

  console.log('Found JO:', jo.jo_number, '| ID:', jo.id);

  // Find assignments
  const { data: assignments, error: assignErr } = await supabase
    .from('jo_warehouse_assignments')
    .select(`
      id,
      quantity,
      location:md_warehouse_locations(code),
      manifest:wo_item_manifests(
        md_product_skus(name, sku_code)
      )
    `)
    .eq('job_order_id', jo.id);

  if (assignErr) {
    console.log('Error fetching assignments:', assignErr);
    return;
  }

  console.log('Total Assignments:', assignments.length);
  assignments.forEach((a, i) => {
    console.log(`[${i+1}] Product: ${a.manifest?.md_product_skus?.name} | Location: ${a.location?.code} | Qty: ${a.quantity}`);
  });
}

checkJO();
