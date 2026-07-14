try {
  global.WebSocket = require('ws');
} catch (e) {
  global.WebSocket = class {};
}

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFunction() {
  console.log("Checking definition of get_active_sla_breaches...");
  try {
    const { data, error } = await supabase.rpc('get_active_sla_breaches', { p_tenant_id: '00000000-0000-0000-0000-000000000000' });
    console.log("Called with dummy tenant_id, returned data length:", data?.length, "Error if any:", error);

    // Query to list functions or proc
    // In PostgreSQL we can get definition of get_active_sla_breaches using pg_get_functiondef
    // We can run a custom query if we query the REST endpoint for schema, or if there is any other way.
    // Let's see if pg_proc is exposed over postgrest:
    const { data: procData, error: procError } = await supabase
      .from('pg_proc')
      .select('prosrc')
      .eq('proname', 'get_active_sla_breaches')
      .limit(1);

    console.log("procError:", procError);
    console.log("procData:", procData);
  } catch (err) {
    console.error("Failed:", err);
  }
}

checkFunction();
