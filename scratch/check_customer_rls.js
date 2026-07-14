require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testCustomerQuery() {
  // 1. Get token for bony
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'bony@customer.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  if (!token) {
    console.log('Login failed:', loginData);
    return;
  }
  console.log('Got Bony JWT token.');

  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${token}`
  };

  const custId = '476fc81c-aa68-414b-bcee-0bc169f1bbe7'; // TAM

  const pRes = await fetch(`${supabaseUrl}/rest/v1/md_product_skus?customer_id=eq.${custId}`, { headers });
  console.log('Bony query md_product_skus status:', pRes.status);
  console.log('Bony query md_product_skus result:', await pRes.text());

  const invRes = await fetch(`${supabaseUrl}/rest/v1/wh_inventory?customer_id=eq.${custId}`, { headers });
  console.log('Bony query wh_inventory status:', invRes.status);
  console.log('Bony query wh_inventory result:', await invRes.text());

  const inRes = await fetch(`${supabaseUrl}/rest/v1/wh_inbound_receipts?customer_id=eq.${custId}`, { headers });
  console.log('Bony query wh_inbound_receipts status:', inRes.status);
  console.log('Bony query wh_inbound_receipts result:', await inRes.text());

  const outRes = await fetch(`${supabaseUrl}/rest/v1/wh_outbound_shipments?customer_id=eq.${custId}`, { headers });
  console.log('Bony query wh_outbound_shipments status:', outRes.status);
  console.log('Bony query wh_outbound_shipments result:', await outRes.text());
}

testCustomerQuery().catch(console.error);
