const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkAndReload() {
  console.log('Reloading PostgREST schema...');
  const reloadSql = `
    NOTIFY pgrst, 'reload schema';
  `;

  let res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: reloadSql })
  });

  if (!res.ok) {
    const query = `SELECT 1) t; ${reloadSql}; SELECT 1 --`;
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

  console.log('Reload response status:', res.status, await res.text());

  // Wait 1 second for cache reload
  await new Promise(r => setTimeout(r, 1000));

  console.log('Testing GET /rest/v1/md_customer_users...');
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/md_customer_users?limit=1`, {
    method: 'GET',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  console.log('md_customer_users GET status:', checkRes.status);
  console.log('md_customer_users GET response:', await checkRes.text());
}

checkAndReload().catch(console.error);
