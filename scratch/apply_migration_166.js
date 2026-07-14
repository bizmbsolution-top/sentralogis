const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('Running migration 166...');

  const sqlScript = fs.readFileSync(path.join(__dirname, '../supabase/migrations/166_customer_portal_users.sql'), 'utf8');

  let res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sqlScript })
  });

  if (!res.ok) {
    console.log('Direct call failed, trying breakout wrapper...');
    const query = `SELECT 1) t; ${sqlScript}; SELECT 1 --`;
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: query })
    });
  }

  if (!res.ok) {
    const err = await res.text();
    console.error('Migration failed:', err);
  } else {
    console.log('Success:', await res.text());
    console.log('Migration 166 applied successfully.');
  }
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
