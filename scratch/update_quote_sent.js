require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/crm_quotations?id=eq.518158d9-bd69-4fcf-b11b-f1d0c87ee059`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: 'SENT' })
    });
    const data = await res.json();
    console.log('Update Result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Update Error:', err);
  }
}
run();
