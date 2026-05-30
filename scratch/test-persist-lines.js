// [AI] Simulating persistLines under user session
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testPersist() {
  console.log("Signing in as admin@halu.com...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@halu.com',
    password: 'password123'
  });

  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }

  const user = authData.user;
  console.log("Logged in!", user.email);

  // Let's get the tenant_id
  const { data: tu } = await supabase.from('tenant_users').select('tenant_id').eq('user_id', user.id).single();
  const tenantId = tu.tenant_id;
  console.log("Tenant ID:", tenantId);

  // Let's get or create a draft invoice for testing
  // Get a work order first
  const { data: wos } = await supabase.from('work_orders').select('id, wo_number').eq('tenant_id', tenantId).limit(1);
  const wo = wos[0];
  console.log("Using work order:", wo);

  const testInvNum = `INV-TEST-PERSIST-${Date.now()}`;
  
  // 1. Create a draft invoice first
  console.log("Creating draft invoice...");
  const { data: inv, error: invErr } = await supabase.from('invoices').insert({
    wo_id: wo.id,
    invoice_number: testInvNum,
    total_billing: 1000000,
    tax_amount: 11000,
    status: 'draft',
    due_date: new Date().toISOString().split('T')[0],
    invoice_date: new Date().toISOString().split('T')[0]
  }).select().single();

  if (invErr) {
    console.error("Failed to create draft invoice:", invErr);
    return;
  }
  console.log("Created draft invoice:", inv.id);

  // 2. Perform persistLines simulation
  console.log("Simulating persistLines...");
  try {
    // 2.1 Delete existing lines
    const { error: delErr } = await supabase
      .from("invoice_lines")
      .delete()
      .eq("invoice_id", inv.id);
    
    if (delErr) console.error("Delete lines error:", delErr);
    else console.log("Deleted existing lines successfully.");

    // 2.2 Insert new lines
    const inserts = [
      {
        invoice_id: inv.id,
        tenant_id: tenantId,
        line_type: 'ritase',
        job_order_id: null,
        extra_cost_id: null,
        description: 'Simulated line 1',
        coa_id: '2f667dbe-80f4-4dca-bd23-0e525fc61326', // Revenue account
        charge_type: 'ritase',
        quantity: 1,
        unit_amount: 1000000,
        amount: 1000000,
        sort_order: 0,
      }
    ];

    const { data: inserted, error: insertErr } = await supabase
      .from("invoice_lines")
      .insert(inserts)
      .select("id, sort_order");

    if (insertErr) {
      console.error("Insert lines error:", insertErr);
    } else {
      console.log("Inserted lines successfully:", inserted);
    }

    // 2.3 Update invoice totals
    const { error: updErr } = await supabase
      .from("invoices")
      .update({
        total_billing: 1000000,
        tax_amount: 11000,
        co_revenue_account_id: '2f667dbe-80f4-4dca-bd23-0e525fc61326',
        updated_at: new Date().toISOString(),
      })
      .eq("id", inv.id);

    if (updErr) {
      console.error("Update invoice totals error:", updErr);
    } else {
      console.log("Updated invoice totals successfully.");
    }

  } catch (e) {
    console.error("Error during persistLines simulation:", e);
  }

  // Clean up
  console.log("Cleaning up...");
  await supabase.from('invoice_lines').delete().eq('invoice_id', inv.id);
  await supabase.from('invoices').delete().eq('id', inv.id);
  console.log("Cleanup done.");
}

testPersist();
