const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/wh_inbound_receipt_items?select=id,expected_qty,actual_good_qty,quarantine_qty,rejected_qty&receipt_id=eq.bbd3ac00-2644-40c3-8a62-7d669c84a2e0';
const key = envConfig.SUPABASE_SERVICE_ROLE_KEY;

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
