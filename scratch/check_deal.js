const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const dealId = 'dc85558d-cb3c-4651-b099-0d459722fc42';
  
  // 1. Fetch deal
  console.log("Fetching deal...");
  const { data: deal, error: dealErr } = await supabase
    .from('crm_deals')
    .select('*')
    .eq('id', dealId)
    .single();
  if (dealErr) console.error("Deal fetch error:", dealErr);
  else console.log("Deal:", deal);

  // 2. Fetch quotations for deal
  console.log("\nFetching quotations for deal...");
  const { data: quotes, error: quotesErr } = await supabase
    .from('crm_quotations')
    .select('*')
    .eq('deal_id', dealId);
  if (quotesErr) console.error("Quotations fetch error:", quotesErr);
  else console.log("Quotations:", quotes);

  // 3. Fetch entity
  if (deal && deal.entity_id) {
    console.log("\nFetching entity...");
    const { data: entity, error: entityErr } = await supabase
      .from('md_entities')
      .select('*')
      .eq('id', deal.entity_id)
      .single();
    if (entityErr) console.error("Entity fetch error:", entityErr);
    else console.log("Entity:", entity);
  }

  // 4. Try updating deal stage to 'WON' to see the exact error
  console.log("\nAttempting to update deal stage to WON...");
  const { data: updateRes, error: updateErr } = await supabase
    .from('crm_deals')
    .update({ stage: 'WON' })
    .eq('id', dealId);
  if (updateErr) {
    console.error("Deal update failed as expected:", updateErr);
  } else {
    console.log("Deal update succeeded! (Wait, did it?)", updateRes);
  }
}

run().catch(console.error);
