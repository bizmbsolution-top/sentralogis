const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/wh_inbound_receipt_items?id=eq.b8672e93-a20f-4c83-8006-2cec26526a2b';
const key = envConfig.SUPABASE_SERVICE_ROLE_KEY;

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ quarantine_qty: 2, rejected_qty: 0 })
})
.then(res => res.status)
.then(status => console.log('Update Status:', status))
.catch(err => console.error(err));
