import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});
async function run() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
  const res = await fetch(url, {
    headers: {
      'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
  const data = await res.json();
  const table = data.definitions.md_warehouse_locations;
  console.log('md_warehouse_locations Columns:', Object.keys(table.properties));
}
run();
