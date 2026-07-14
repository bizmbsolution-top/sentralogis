const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function test() {
  console.log("=== Checking pg_policies for repacking tables ===");
  
  // We can query custom sql or check from a database view if we don't have direct pg access.
  // Actually, we can use the bypass_alter RPC or other RPC if it exists, or just query standard schemas
  // using PostgREST if we have permissions.
  // Since pg_policies is system catalog, PostgREST might not expose it unless there's an RPC.
  // Wait, let's see if we have RPC `exec_sql_manual` in the database.
  // Let's call the `exec_sql_manual` RPC to select policies.
  const rpcUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql_manual`;
  const sql = "SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE tablename IN ('wh_repacking_orders', 'wh_repacking_items')";
  
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!res.ok) {
    console.error("Error executing RPC:", res.status, await res.text());
    // Fallback: let's try direct REST API query on information_schema or others if possible
    return;
  }
  
  const data = await res.json();
  console.log("Policies in DB:", JSON.stringify(data, null, 2));
}

test();
