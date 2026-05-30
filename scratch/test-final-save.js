// [AI] Simulating final draft save with invoice_date column
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

async function testFinalSave() {
  console.log("Simulating draft save with invoice_date column...");
  
  const { data: wos } = await supabase.from('work_orders').select('id, wo_number').limit(1);
  if (!wos || wos.length === 0) {
    console.error("No work orders found.");
    return;
  }
  const wo = wos[0];
  const testInvNum = `INV-TEST-FINAL-${Date.now()}`;

  // Attempt INSERT
  const { data: insData, error: insErr } = await supabase.from('invoices').insert({
    wo_id: wo.id,
    invoice_number: testInvNum,
    total_billing: 600000,
    tax_amount: 6600,
    status: 'draft',
    due_date: new Date().toISOString(),
    invoice_date: new Date().toISOString().split('T')[0], // Use invoice_date!
    sent_at: null,
    line_items: [{ qty: 1, amount: 600000, description: "Final test draft" }]
  }).select();

  if (insErr) {
    console.error("INSERT Error:", insErr);
  } else {
    console.log("INSERT Success!", insData);

    // Attempt UPDATE
    const { data: updData, error: updErr } = await supabase.from('invoices').update({
      total_billing: 700000,
      tax_amount: 7700,
      line_items: [{ qty: 1, amount: 700000, description: "Final test draft edited" }]
    }).eq('wo_id', wo.id).select();

    if (updErr) {
      console.error("UPDATE Error:", updErr);
    } else {
      console.log("UPDATE Success!", updData);
    }

    // Clean up
    await supabase.from('invoices').delete().eq('id', insData[0].id);
    console.log("Cleaned up successfully.");
  }
}

testFinalSave();
