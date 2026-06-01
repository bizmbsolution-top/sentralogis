import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.split('NEXT_PUBLIC_SUPABASE_URL=')[1].split('\n')[0].trim();
const key = env.split('NEXT_PUBLIC_SUPABASE_ANON_KEY=')[1].split('\n')[0].trim();

async function run() {
  const res = await fetch(`${url}/rest/v1/work_orders?select=id,wo_number&order=created_at.desc&limit=5`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const wos = await res.json();
  console.log("Latest WOs:", wos.map(w => w.wo_number));
}

run();
