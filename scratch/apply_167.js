require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' };
  
  // Note: we can run raw SQL if there is an rpc like exec_sql, or we can check via rest or directly via postgres/supabase rpc
  // Let's check if exec_sql exists
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS container_number text; CREATE INDEX IF NOT EXISTS idx_job_orders_container_number ON job_orders(container_number);" })
  });
  console.log('exec_sql response status:', checkRes.status);
  const checkText = await checkRes.text();
  console.log('exec_sql response:', checkText);
}

applyMigration().catch(console.error);
