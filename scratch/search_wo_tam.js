
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

async function searchWO() {
  const { data: wos, error } = await supabase
    .from('work_orders')
    .select('id, wo_number, status')
    .ilike('wo_number', '%TAM%')
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- WORK ORDERS FOUND WITH "TAM" ---');
  wos.forEach(w => {
    console.log(`WO: ${w.wo_number} | ID: ${w.id} | Status: ${w.status}`);
  });

  if (wos.length > 0) {
    const { data: items } = await supabase
      .from('wo_items')
      .select('id, item_code, status, item_data')
      .eq('wo_id', wos[0].id);
    
    console.log('\n--- ITEMS FOR FIRST WO FOUND ---');
    items?.forEach(i => {
      console.log(`Item Code: ${i.item_code} | Status: ${i.status}`);
    });
  }
}

searchWO();
