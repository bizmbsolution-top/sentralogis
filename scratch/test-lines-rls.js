// [AI] check invoice_lines RLS
const fs = require('fs');
const path = require('path');

try {
  global.WebSocket = require('ws');
} catch (e) {
  global.WebSocket = class {};
}

const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkInvoiceLinesRLS() {
  console.log("Checking RLS policies and status for invoice_lines...");
  try {
    const { data: policies, error } = await supabase.rpc('exec_sql_manual', {
      sql_query: "SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'invoice_lines'"
    });

    if (error) throw error;
    console.log("Policies for invoice_lines:");
    console.log(JSON.stringify(policies, null, 2));

    const { data: rlsStatus } = await supabase.rpc('exec_sql_manual', {
      sql_query: "SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'invoice_lines'"
    });
    console.log("RLS Status:", rlsStatus);

  } catch (err) {
    console.error("Failed:", err);
  }
}

checkInvoiceLinesRLS();
