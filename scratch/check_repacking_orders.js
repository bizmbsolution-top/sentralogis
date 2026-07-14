require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const url = `${SUPABASE_URL}/rest/v1/wh_repacking_orders?select=id,order_number,order_type,status,priority,created_at,notes,customer_id,customer:md_entities(name)&status=eq.IN_PROGRESS`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log('Status Code:', res.status);
    console.log('Response Body:', text);
  } catch(e) {
    console.error(e);
  }
}

test();
