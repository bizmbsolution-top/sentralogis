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
  const id = "a804ddd9-8a7d-4cc0-a192-3febbf0516b7"; // The one I inserted
  const url = `${supabaseUrl}/rest/v1/job_orders?select=*,wo_item:wo_items!wo_item_id(id,item_code,item_data,wo:work_orders!wo_id(wo_number,order_date,execution_date,customer:md_entities!customer_id(name)))&id=eq.${id}`;
  
  console.log("Fetching url:", url);
  
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    console.error("Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Found records:", data.length);
  if (data.length > 0) {
    console.log(JSON.stringify(data[0], null, 2));
  }
}

test();
