require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkCols() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` };
  const res = await fetch(`${supabaseUrl}/rest/v1/job_orders?limit=1`, { headers });
  const data = await res.json();
  console.log('Has container_number col?', 'container_number' in (data[0] || {}));
}

checkCols().catch(console.error);
