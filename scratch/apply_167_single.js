require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applySingle() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  const res1 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text" })
  });
  console.log('ALTER TABLE response:', res1.status, await res1.text());

  const res2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: "CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number)" })
  });
  console.log('CREATE INDEX response:', res2.status, await res2.text());
}

applySingle().catch(console.error);
