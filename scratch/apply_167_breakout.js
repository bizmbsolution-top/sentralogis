require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyBreakout() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  const sql = `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text; CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number);`;
  const breakoutQuery = `SELECT 1) t; ${sql}; SELECT 1 --`;
  
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql_query: breakoutQuery })
  });
  console.log('Breakout response status:', res.status);
  console.log('Breakout response text:', await res.text());
}

applyBreakout().catch(console.error);
