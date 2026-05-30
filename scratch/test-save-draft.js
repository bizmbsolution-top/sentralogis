// [AI] Simulating draft save operation under ANON key
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSave() {
  console.log("Simulating a draft save with ANON client...");
  // Let's get one work_order to use its ID
  const { data: wos, error: wosErr } = await supabase.from('work_orders').select('id, wo_number').limit(1);
  if (wosErr) {
    console.error("Error fetching work orders with anon key:", wosErr);
    return;
  }
  if (!wos || wos.length === 0) {
    console.error("No work orders found in DB");
    return;
  }
  const wo = wos[0];
  console.log("Using work_order:", wo);

  const invNumber = `INV-${wo.wo_number}`;
  const totalBilling = 1500000;
  const totalTax = 16500;
  const lineItems = [
    {
      jo_id: "7fb83a3f-a7b0-4a29-88f7-a7e21f27a6a8",
      jo_number: "JO-001",
      line_number: 1,
      description: "Test line description",
      coa_id: "2f667dbe-80f4-4dca-bd23-0e525fc61326",
      coa_label: "Revenue",
      tax_id: null,
      tax_name: "",
      tax_rate: 0,
      qty: 1,
      unit_price: 1500000,
      amount: 1500000,
      truck_type: "CDD",
      route: "Jakarta -> Bandung",
      is_custom: false
    }
  ];

  // Try updating first (simulation of isEditing = true)
  console.log("Attempting UPDATE for wo_id:", wo.id);
  const { data: updateData, error: updateError } = await supabase.from('invoices').update({
    total_billing: totalBilling,
    tax_amount: totalTax,
    status: 'draft',
    due_date: new Date().toISOString(),
    line_items: lineItems,
  }).eq('wo_id', wo.id).select();

  console.log("Update Error:", updateError);
  console.log("Update Data:", updateData);

  // If update didn't match any rows, let's try INSERT
  if (!updateData || updateData.length === 0) {
    console.log("No row updated, attempting INSERT...");
    const { data: insertData, error: insertError } = await supabase.from('invoices').insert({
      wo_id: wo.id,
      invoice_number: invNumber,
      total_billing: totalBilling,
      tax_amount: totalTax,
      status: 'draft',
      due_date: new Date().toISOString(),
      invoiced_at: null,
      sent_at: null,
      line_items: lineItems,
    }).select();

    console.log("Insert Error:", insertError);
    console.log("Insert Data:", insertData);
  }

  // Let's verify what is stored in the DB now
  console.log("Verifying data in DB...");
  const { data: verifyData, error: verifyErr } = await supabase.from('invoices').select('*').eq('wo_id', wo.id);
  console.log("Stored invoice in DB (anon):", JSON.stringify(verifyData, null, 2));
}

testSave();
