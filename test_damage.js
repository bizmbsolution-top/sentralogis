const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/wh_inbound_damage_records?receipt_item_id=eq.b8672e93-a20f-4c83-8006-2cec26526a2b&select=*';
const key = envConfig.SUPABASE_SERVICE_ROLE_KEY;

fetch(url, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } })
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
