require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const url = `${SUPABASE_URL}/rest/v1/wh_repacking_orders?select=id,order_number,status,reference_id`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    const res = await fetch(url, { headers });
    const orders = await res.json();
    console.log('Orders:', JSON.stringify(orders, null, 2));

    for (const order of orders) {
      if (order.reference_id) {
        const joUrl = `${SUPABASE_URL}/rest/v1/job_orders?select=id,jo_number,status&id=eq.${order.reference_id}`;
        const joRes = await fetch(joUrl, { headers });
        const joData = await joRes.json();
        console.log(`Related Job Order for ${order.order_number}:`, joData);
      }
    }
  } catch(e) {
    console.error(e);
  }
}

test();
