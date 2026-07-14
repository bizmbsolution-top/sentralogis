const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!url || !key) {
  console.error("Missing credentials");
  process.exit(1);
}

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function run() {
  const dealId = 'dc85558d-cb3c-4651-b099-0d459722fc42';

  // 1. Fetch deal
  console.log("Fetching deal...");
  const rDeal = await fetch(`${url}/rest/v1/crm_deals?id=eq.${dealId}`, { headers });
  const deal = await rDeal.json();
  console.log("Deal:", JSON.stringify(deal, null, 2));

  if (!deal || deal.length === 0) {
    console.error("Deal not found");
    return;
  }

  // 2. Fetch quotations for deal
  console.log("\nFetching quotations for deal...");
  const rQuotes = await fetch(`${url}/rest/v1/crm_quotations?deal_id=eq.${dealId}`, { headers });
  const quotes = await rQuotes.json();
  console.log("Quotations:", JSON.stringify(quotes, null, 2));

  // 3. Fetch entity
  const entityId = deal[0].entity_id;
  if (entityId) {
    console.log("\nFetching entity...");
    const rEntity = await fetch(`${url}/rest/v1/md_entities?id=eq.${entityId}`, { headers });
    const entity = await rEntity.json();
    console.log("Entity:", JSON.stringify(entity, null, 2));
  }

  // 4. Try updating deal stage to 'WON' to see the exact error
  console.log("\nAttempting to update deal stage to WON...");
  const rUpdate = await fetch(`${url}/rest/v1/crm_deals?id=eq.${dealId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ stage: 'WON' })
  });
  console.log("Update status code:", rUpdate.status);
  console.log("Update response:", await rUpdate.text());
}

run().catch(console.error);
