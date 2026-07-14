require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function run() {
  const url = `${SUPABASE_URL}/rest/v1/crm_quotations?deal_id=eq.dc85558d-cb3c-4651-b099-0d459722fc42&select=*,crm_quotation_sections(*),crm_deals(*)`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
  };
  try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
