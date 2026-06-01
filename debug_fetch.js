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
  const url = `${supabaseUrl}/rest/v1/job_orders?select=id,jo_number,status,created_at,tenant_id,wo_item:wo_items!inner(id,sbu_type,item_data,wo:work_orders!wo_id(id,wo_number,customer:md_entities!customer_id(name,legal_name)))&limit=10`;
  
  console.log("Fetching url:", url);
  
  const res = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.error("Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Found", data.length, "records.");
  if (data.length > 0) {
    console.log(JSON.stringify(data[0], null, 2));
  }
}

test();
