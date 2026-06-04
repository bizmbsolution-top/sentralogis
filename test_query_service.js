const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/jo_warehouse_assignments?select=job_order_id,wo_item_manifest_id,md_warehouse_locations(code),wo_item_manifests!wo_item_manifest_id(product_sku_id)&limit=2';
const key = envConfig.SUPABASE_SERVICE_ROLE_KEY; 

fetch(url, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } })
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
