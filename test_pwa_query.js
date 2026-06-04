const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const { createClient } = require('@supabase/supabase-js');

// Must use a node-fetch or similar since websocket is broken in Node 20
// Let's just use raw fetch to simulate the exact PWA query
const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/jo_warehouse_assignments?select=warehouse_location_id,location:md_warehouse_locations(code),wo_item_manifests!wo_item_manifest_id(product_sku_id)&limit=2';
const key = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
