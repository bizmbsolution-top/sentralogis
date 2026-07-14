require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function test() {
  const url = `${SUPABASE_URL}/rest/v1/md_warehouse_staff?select=id,name,role,roles`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };

  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log('Result for roles column:', data);
  } catch(e) {
    console.error(e);
  }
}

test();
