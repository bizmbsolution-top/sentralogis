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

async function run() {
  const sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_quotation_items' AND (column_name = 'sbu_metadata' OR column_name = 'remarks')";

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
    console.error('Failed to query:', err);
  } else {
    const data = await res.json();
    console.log('Target columns in crm_quotation_items:', data);
  }
}

run();
