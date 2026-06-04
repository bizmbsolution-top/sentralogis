const https = require('https');
require('dotenv').config({ path: '.env.local' });

const query = `
  set local role authenticated;
  set local request.jwt.claim.sub = 'efd3f9bd-d7e4-4336-8057-b4844acf830d';
  select id, tenant_code, token_balance from public.tenants where user_id = 'efd3f9bd-d7e4-4336-8057-b4844acf830d';
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
