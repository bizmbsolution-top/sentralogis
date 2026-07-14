require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text; CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number);" })
  });
  console.log('exec_sql_manual response status:', checkRes.status);
  const checkText = await checkRes.text();
  console.log('exec_sql_manual response:', checkText);

  // If query vs sql parameter:
  if (checkRes.status === 400 || checkRes.status === 404) {
    const checkRes2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql_query: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text; CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number);" })
    });
    console.log('exec_sql_manual (sql_query) response:', checkRes2.status, await checkRes2.text());
  }
}

applyMigration().catch(console.error);
