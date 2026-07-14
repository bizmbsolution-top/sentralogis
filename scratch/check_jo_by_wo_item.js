require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    const url = `${SUPABASE_URL}/rest/v1/job_orders?select=id,jo_number,status,wo_item_id`;
    const res = await fetch(url, { headers });
    const jobOrders = await res.json();
    console.log('Job Orders:', JSON.stringify(jobOrders, null, 2));
  } catch(e) {
    console.error(e);
  }
}

test();
