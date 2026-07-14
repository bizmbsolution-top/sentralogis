const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function alterTable() {
  console.log('Adding portal_password column to md_customer_users...');
  const sql = `
    ALTER TABLE public.md_customer_users 
    ADD COLUMN IF NOT EXISTS portal_password TEXT DEFAULT 'Password123!';

    UPDATE public.md_customer_users 
    SET portal_password = 'Password123!' 
    WHERE portal_password IS NULL;

    NOTIFY pgrst, 'reload schema';
  `;

  let res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!res.ok) {
    const query = `SELECT 1) t; ${sql}; SELECT 1 --`;
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

  console.log('Alter table response:', res.status, await res.text());
}

alterTable().catch(console.error);
