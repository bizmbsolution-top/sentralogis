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

async function listInvoices() {
  console.log("Fetching all invoices from DB...");
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, wo_id, status, total_billing, tax_amount, invoice_date, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    console.log("Total Invoices:", invoices.length);
    console.log("Invoices:", JSON.stringify(invoices, null, 2));

    for (const inv of invoices) {
      const { data: lines } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', inv.id);
      console.log(`Lines for Invoice ${inv.invoice_number} (${inv.id}):`, lines.length);
      if (lines.length > 0) {
        console.log(JSON.stringify(lines, null, 2));
      }
    }
  } catch (err) {
    console.error("Failed:", err);
  }
}

listInvoices();
