const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && k.trim()) vars[k.trim()] = v.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const s = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await s.rpc('exec_sql_manual', {
    sql_query: "SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'register_tenant_test'"
  });
  if (data && data[0]) console.log(data[0].def);
  if (error) console.error('ERR:', error.message);
}
main();
