// [AI] Simulating constraint inspection
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log("Fetching unique constraints and keys for invoices table...");
  try {
    const { data, error } = await supabase.rpc('exec_sql_manual', {
      sql_query: `
        SELECT conname, contype, pg_get_constraintdef(c.oid) as condef
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'invoices'
      `
    });

    if (error) {
      console.error("Failed to query constraints:", error);
    } else {
      console.log("Constraints on invoices:", data);
    }

  } catch (err) {
    console.error("Failed:", err);
  }
}

checkConstraints();
