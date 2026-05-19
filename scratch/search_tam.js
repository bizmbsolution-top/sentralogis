
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchTAM() {
  const { data: items, error } = await supabase
    .from('wo_items')
    .select('id, item_code, status, item_data')
    .ilike('item_code', '%TAM%')
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- ITEMS FOUND WITH "TAM" ---');
  items.forEach(i => {
    console.log(`Code: ${i.item_code} | ID: ${i.id} | Status: ${i.status}`);
  });
}

searchTAM();
