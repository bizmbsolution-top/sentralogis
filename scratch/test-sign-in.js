// [AI] Sign in and test RLS
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

async function testSession() {
  console.log("Signing in as admin@halu.com...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@halu.com',
    password: 'password123'
  });

  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }

  // Fetch tenant info
  const { data: { user } } = await supabase.auth.getUser();
  console.log("Logged in user:", user.email, "ID:", user.id);

  // Fetch tenant_users
  const { data: tu, error: tuErr } = await supabase.from('tenant_users').select('*').eq('user_id', user.id).maybeSingle();
  if (tuErr) {
    console.error("Error fetching tenant_users:", tuErr);
    return;
  }
  console.log("tenant_users row:", tu);

  if (!tu) {
    console.log("No tenant_users row found! Let's check with service role key...");
    const serviceSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: tuService } = await serviceSupabase.from('tenant_users').select('*').eq('user_id', user.id).maybeSingle();
    console.log("tenant_users row (service role):", tuService);
    return;
  }

  const tenantId = tu.tenant_id;

  // Fetch work orders
  const { data: wos, error: wosErr } = await supabase.from('work_orders').select('id, wo_number').eq('tenant_id', tenantId);
  if (wosErr) {
    console.error("Error fetching work orders:", wosErr);
    return;
  }
  console.log(`Work orders count for tenant ${tenantId}: ${wos?.length}`);

  if (wos && wos.length > 0) {
    const wo = wos[0];
    console.log("Testing insert on invoices table for wo:", wo.wo_number);

    const testInvNum = `INV-TEST-TEMP-${Date.now()}`;
    const { data: insData, error: insErr } = await supabase.from('invoices').insert({
      wo_id: wo.id,
      invoice_number: testInvNum,
      total_billing: 500000,
      tax_amount: 5500,
      status: 'draft',
      due_date: new Date().toISOString(),
      invoiced_at: null,
      sent_at: null,
      line_items: [{ qty: 1, amount: 500000, description: "Test item" }]
    }).select();

    if (insErr) {
      console.error("Anon insert error on invoices:", insErr);
    } else {
      console.log("Anon insert success!", insData);
      
      // Select it back
      const { data: selData, error: selErr } = await supabase.from('invoices').select('*').eq('wo_id', wo.id);
      console.log("Anon select result on invoices:", selData);

      // Clean up
      const { error: delErr } = await supabase.from('invoices').delete().eq('id', insData[0].id);
      console.log("Clean up error:", delErr);
    }
  }
}

testSession();
