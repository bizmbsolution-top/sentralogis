require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const url1 = `${SUPABASE_URL}/rest/v1/md_storage_contracts?select=*,md_entities(name,code),md_warehouses(name)&limit=5`;
  const url2 = `${SUPABASE_URL}/rest/v1/md_storage_contracts?select=*,md_entities!md_storage_contracts_customer_id_fkey(name,code),md_warehouses!md_storage_contracts_warehouse_id_fkey(name)&limit=5`;

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    const res1 = await fetch(url1, { headers });
    const text1 = await res1.text();
    console.log('--- TEST 1 (Without Explicit FKEY Name) ---');
    console.log('Status:', res1.status);
    console.log('Response:', text1.substring(0, 500));

    const res2 = await fetch(url2, { headers });
    const text2 = await res2.text();
    console.log('\n--- TEST 2 (With Explicit FKEY Name) ---');
    console.log('Status:', res2.status);
    console.log('Response:', text2.substring(0, 500));
  } catch(e) {
    console.error(e);
  }
}

test();
