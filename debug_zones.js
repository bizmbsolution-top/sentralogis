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
  const url = `${supabaseUrl}/rest/v1/md_warehouse_locations?select=zone,code&warehouse_id=eq.9f82b2f9-d6ea-4eac-91d0-332b0fd07559`;
  const res = await fetch(url, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const data = await res.json();
  const zones = {};
  data.forEach(d => {
    zones[d.zone] = (zones[d.zone] || 0) + 1;
  });
  console.log("Zones for this WH:", zones);
  
  // also check another WH
  const url2 = `${supabaseUrl}/rest/v1/md_warehouse_locations?select=zone,code&warehouse_id=eq.5ef2429a-5cdd-459b-9ed3-47f3e7bfe6fe`;
  const res2 = await fetch(url2, { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } });
  const data2 = await res2.json();
  const zones2 = {};
  data2.forEach(d => {
    zones2[d.zone] = (zones2[d.zone] || 0) + 1;
  });
  console.log("Zones for SBY WH:", zones2);
}

test();
