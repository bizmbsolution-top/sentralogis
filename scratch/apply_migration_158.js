const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('Running migration 158 with SQL breakout...');

  const sqlScript = `
    DROP POLICY IF EXISTS "Enable public SELECT for repacking orders" ON wh_repacking_orders;
    CREATE POLICY "Enable public SELECT for repacking orders" ON wh_repacking_orders FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Enable public UPDATE for repacking orders" ON wh_repacking_orders;
    CREATE POLICY "Enable public UPDATE for repacking orders" ON wh_repacking_orders FOR UPDATE USING (true);

    DROP POLICY IF EXISTS "Enable public SELECT for repacking items" ON wh_repacking_items;
    CREATE POLICY "Enable public SELECT for repacking items" ON wh_repacking_items FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Enable public UPDATE for repacking items" ON wh_repacking_items;
    CREATE POLICY "Enable public UPDATE for repacking items" ON wh_repacking_items FOR UPDATE USING (true);
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
    console.log('Migration 158 applied successfully.');
  }
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
