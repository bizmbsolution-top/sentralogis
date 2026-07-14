const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  console.log('Running migration 165...');

  const sqlScript = `
    ALTER TABLE md_warehouse_staff 
    ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::TEXT[];

    UPDATE md_warehouse_staff 
    SET roles = ARRAY[role] 
    WHERE (roles IS NULL OR roles = '{}'::TEXT[]) AND role IS NOT NULL;

    CREATE OR REPLACE FUNCTION sync_warehouse_staff_roles()
    RETURNS TRIGGER AS $$
    BEGIN
        IF NEW.roles IS NOT NULL AND ARRAY_LENGTH(NEW.roles, 1) > 0 THEN
            IF NEW.role IS NULL OR NOT (NEW.role = ANY(NEW.roles)) THEN
                NEW.role := NEW.roles[1];
            END IF;
        ELSIF NEW.role IS NOT NULL THEN
            NEW.roles := ARRAY[NEW.role];
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_sync_warehouse_staff_roles ON md_warehouse_staff;

    CREATE TRIGGER trg_sync_warehouse_staff_roles
    BEFORE INSERT OR UPDATE ON md_warehouse_staff
    FOR EACH ROW
    EXECUTE FUNCTION sync_warehouse_staff_roles();
  `;

  // Try direct exec_sql_manual or breakout
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
    console.log('Migration 165 applied successfully.');
  }
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
