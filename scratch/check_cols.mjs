import fs from 'fs';

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  console.log('Fetching latest rows from jo_warehouse_assignments...');
  const res = await fetch(`${supabaseUrl}/rest/v1/jo_warehouse_assignments?select=*&order=created_at.desc&limit=5`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (!res.ok) {
    console.error('Error fetching:', res.status, await res.text());
  } else {
    const data = await res.json();
    console.log('SUCCESS! Latest rows retrieved:', JSON.stringify(data, null, 2));
  }
}

run();
