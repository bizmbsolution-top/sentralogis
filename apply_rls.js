const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) env[match[1].trim()] = match[2].trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  const sqls = [
    "CREATE POLICY \"driver_portal_jo_select\" ON public.job_orders FOR SELECT USING (auth.role() = 'anon');",
    "CREATE POLICY \"driver_portal_routes_select\" ON public.job_routes FOR SELECT USING (auth.role() = 'anon');",
    "CREATE POLICY \"driver_portal_wo_items_select\" ON public.wo_items FOR SELECT USING (auth.role() = 'anon');"
  ];
  for (const sql of sqls) {
    console.log('Running:', sql);
    const { error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
    console.log('Error:', error);
  }
}
applyMigration();
