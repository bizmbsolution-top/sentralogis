require('dotenv').config({ path: '.env.local' });
const fs = require('fs');

let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
} catch (e) {
  console.error('Error reading .env.local file:', e.message);
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function execute(sql) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed to execute:`, err);
    return false;
  } else {
    const data = await res.json();
    console.log(`Success! Result:`, data);
    return true;
  }
}

async function run() {
  console.log('Widening wo_items.item_code...');
  const query1 = `SELECT 1) t; ALTER TABLE public.wo_items ALTER COLUMN item_code TYPE character varying(150); SELECT 1 as id --`;
  await execute(query1);
}

run();
