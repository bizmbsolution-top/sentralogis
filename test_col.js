const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/wh_inbound_receipt_items?id=eq.00000000-0000-0000-0000-000000000000';
const key = envConfig.SUPABASE_SERVICE_ROLE_KEY;

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ putaway_entries: [] })
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(({status, data}) => console.log(status, JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
