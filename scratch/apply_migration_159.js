const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('Running migration 159 with SQL breakout...');

  const sqlScript = `
    ALTER TABLE md_warehouse_staff 
    DROP CONSTRAINT IF EXISTS md_warehouse_staff_role_check;

    ALTER TABLE md_warehouse_staff 
    ADD CONSTRAINT md_warehouse_staff_role_check 
    CHECK (role IN ('SECURITY', 'TALLY', 'PUTAWAY', 'ADMIN', 'ADD_SERVICE'));
  `;

  // Breakout of PostgREST RPC subquery wrapper
  const query = `SELECT 1) t; ${sqlScript}; SELECT 1 --`;

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: query })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Migration failed:', err);
    process.exit(1);
  } else {
    console.log('Success:', await res.text());
    console.log('Migration 159 applied successfully.');
  }
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
