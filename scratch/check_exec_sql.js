require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkProc() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  // Let's test if exec_sql_manual runs a SELECT query inside
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: "pg_proc where proname = 'exec_sql_manual'" })
  });
  console.log('SELECT response:', res.status, await res.text());
}

checkProc().catch(console.error);
