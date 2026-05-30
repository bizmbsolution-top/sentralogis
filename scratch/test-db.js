// [AI] database schema and insert inspection
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

async function checkInvoiceLines() {
  console.log("Checking all rows in invoice_lines table...");
  try {
    const { data: lines, error } = await supabase
      .from('invoice_lines')
      .select('*');

    if (error) throw error;
    console.log("All invoice_lines in DB:", lines);

  } catch (err) {
    console.error("Failed:", err);
  }
}

checkInvoiceLines();
