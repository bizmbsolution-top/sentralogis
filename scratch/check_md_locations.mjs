import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});
async function run() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/md_warehouse_locations?limit=1`;
  const res = await fetch(url, {
    headers: {
      'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
}
run();
