const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) env[match[1].trim()] = match[2].trim();
});

async function applyMigration() {
  const sql = "CREATE TABLE IF NOT EXISTS test_sql_exec (id int);";
  
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error('Failed:', res.status, err);
  } else {
    console.log('Success:', await res.json());
  }
}
applyMigration();
