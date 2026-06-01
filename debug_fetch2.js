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
  const url = `${supabaseUrl}/rest/v1/wo_items?select=id,item_code,sbu_type,status,wo_id,job_orders(id,jo_number,status)&limit=10&order=created_at.desc`;
  
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
  console.log("Found", data.length, "wo_items.");
  console.log(JSON.stringify(data, null, 2));
}

test();
