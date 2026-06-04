import fs from 'fs';

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  console.log('Fetching latest rows from wo_item_manifests...');
  const res = await fetch(`${supabaseUrl}/rest/v1/wo_item_manifests?select=id,wo_item_id,job_order_id,quantity,product_sku_id&limit=10`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.error('Error fetching:', res.status, await res.text());
  } else {
    const data = await res.json();
    console.log('SUCCESS! Manifests retrieved:', JSON.stringify(data, null, 2));
  }
}

run();
