
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

async function checkItemTAM() {
  // Gunakan ilike untuk mencari item_code
  const { data: items, error: itemError } = await supabase
    .from('wo_items')
    .select('id, item_code, status, item_data')
    .ilike('item_code', '%SL-TAM-0526-001/TR01%');

  if (itemError) {
    console.error('Error fetching item:', itemError);
    return;
  }

  if (!items || items.length === 0) {
    console.log('No items found matching SL-TAM-0526-001/TR01');
    return;
  }

  for (const item of items) {
    const { data: jos, error: joError } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, transporter_id, fleet_id, driver_id, transporter:md_entities!transporter_id(name)')
      .eq('wo_item_id', item.id);

    console.log(`\n--- WO ITEM: ${item.item_code} ---`);
    console.log('ID:', item.id);
    console.log('Status:', item.status);
    const itemData = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : item.item_data;
    console.log('Unit Count Ordered:', itemData?.unit_count || 1);
    console.log('Truck Type:', itemData?.vehicle_type || 'N/A');
    
    console.log('\n--- JOB ORDERS (Assignments) ---');
    if (!jos || jos.length === 0) {
      console.log('No Job Orders found.');
    } else {
      jos.forEach((jo, i) => {
        console.log(`\n[JO #${i+1}]`);
        console.log('JO Number:', jo.jo_number);
        console.log('Status:', jo.status);
        console.log('Transporter:', jo.transporter?.name || 'NOT ASSIGNED');
        console.log('Fleet ID:', jo.fleet_id || 'NOT ASSIGNED');
        console.log('Driver ID:', jo.driver_id || 'NOT ASSIGNED');
      });
    }
  }
}

checkItemTAM();
