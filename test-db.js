const https = require('https');
require('dotenv').config({ path: '.env.local' });

const query = `
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND (table_name LIKE '%contract%' OR table_name LIKE '%price%' OR table_name LIKE '%sla%' OR table_name LIKE '%deal%' OR table_name LIKE '%crm%');
`;

const payload = JSON.stringify({ sql_query: query });

const options = {
  hostname: process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', ''),
  path: '/rest/v1/rpc/exec_sql_manual',
  method: 'POST',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("DB DATA:", data));
});

req.on('error', err => console.error(err));
req.write(payload);
req.end();
