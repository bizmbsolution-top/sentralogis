require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testItemsRLS() {
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'bony@customer.com', password: 'Password123!' })
  });
  const { access_token } = await loginRes.json();
  const headers = { 'apikey': anonKey, 'Authorization': `Bearer ${access_token}` };

  const inRes = await fetch(`${supabaseUrl}/rest/v1/wh_inbound_items?limit=5`, { headers });
  console.log('inbound_items status:', inRes.status, await inRes.text());

  const outRes = await fetch(`${supabaseUrl}/rest/v1/wh_outbound_items?limit=5`, { headers });
  console.log('outbound_items status:', outRes.status, await outRes.text());
}

testItemsRLS().catch(console.error);
