const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/jo_warehouse_assignments?select=*';
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
