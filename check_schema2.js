const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {}

fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/fw_consolidations?select=*&limit=1', {
  headers: {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
  }
}).then(r => r.json()).then(console.log).catch(console.error);
