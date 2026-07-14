const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'];

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  const testQuery = `SELECT 1) t; CREATE TEMP TABLE temp_test(id int); INSERT INTO temp_test VALUES (42); SELECT jsonb_agg(temp_test) FROM temp_test; --`;
  
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sql_query: testQuery
    })
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}

run().catch(console.error);
