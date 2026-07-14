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
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function test() {
  const repUrl = `${supabaseUrl}/rest/v1/wh_repacking_items?repacking_order_id=eq.b90cb500-9590-4f7b-9a40-ad6380dc39f1&select=*,product:md_product_skus(name,sku_code,unit)`;
  const res = await fetch(repUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  const data = await res.json();
  console.log("Items for REP-1782304550026:", JSON.stringify(data, null, 2));
}

test();
