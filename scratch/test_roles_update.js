require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testUpdate() {
  // Try updating Anton (id 34ec53bf-e6cd-4944-9670-770ae805908d) to roles: ['TALLY', 'PUTAWAY']
  const url = `${SUPABASE_URL}/rest/v1/md_warehouse_staff?id=eq.34ec53bf-e6cd-4944-9670-770ae805908d`;
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
      body: JSON.stringify({
        role: 'TALLY',
        roles: ['TALLY', 'PUTAWAY']
      })
    });
    const data = await res.json();
    console.log('Update result for Anton:', data);
  } catch(e) {
    console.error(e);
  }
}

testUpdate();
