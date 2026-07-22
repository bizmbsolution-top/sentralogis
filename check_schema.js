const fs = require('fs');
let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {
  process.exit(1);
}
const query = `SELECT json_agg(column_name) FROM information_schema.columns WHERE table_name = 'fw_consolidations') t; SELECT 1 --`;
fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql_manual', {
  method: 'POST',
  headers: {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ sql_query: query })
}).then(r => r.json()).then(console.log).catch(console.error);
