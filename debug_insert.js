const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function test() {
  const url = `${supabaseUrl}/rest/v1/job_orders`;
  
  const payload = {
    tenant_id: "78846049-fb63-45a9-93da-3af3fea5b587",
    jo_number: "TEST-WH-001",
    wo_item_id: "400e72b4-7562-4bf1-9722-402d0c24afe9",
    status: "pending",
    tracking_token: "test-token-1234"
  };

  console.log("Attempting insert...");
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    console.error("Insert failed:", res.status, await res.text());
  } else {
    console.log("Insert succeeded!");
    console.log(await res.json());
  }
}

test();
