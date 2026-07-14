require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkRpcs() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: "(select proname from pg_proc join pg_namespace n on n.oid = pronamespace where n.nspname = 'public') as t" })
  });
  console.log('RPCs:', res.status, await res.text());
}

checkRpcs().catch(console.error);
