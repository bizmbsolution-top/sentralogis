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

const missingJOs = [
  { wo_item_id: "400e72b4-7562-4bf1-9722-402d0c24afe9", jo_number: "HALU-TAM-0526-002/WH01-01" },
  { wo_item_id: "023838bc-00b9-4564-a513-b575f7471017", jo_number: "HALU-TAM-0526-001/WH01-01" },
  { wo_item_id: "10477cd9-5408-4463-89d5-4a3272263a33", jo_number: "WO/20260531/0005/WH01-01" }
];

async function fix() {
  for (const jo of missingJOs) {
    const payload = {
      tenant_id: "78846049-fb63-45a9-93da-3af3fea5b587",
      jo_number: jo.jo_number,
      wo_item_id: jo.wo_item_id,
      status: "pending",
      tracking_token: "fixed-" + Date.now()
    };
    
    console.log("Fixing", jo.jo_number);
    const res = await fetch(`${supabaseUrl}/rest/v1/job_orders`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error("Failed:", await res.text());
    } else {
      console.log("Success");
    }
  }
}

fix();
