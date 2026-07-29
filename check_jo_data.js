require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function query(table, select = '*', filter = '') {
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  if (filter) url += `&${filter}`;
  const res = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`Error on ${table}: ${res.status} ${txt}`);
    return [];
  }
  return res.json();
}

async function main() {
  // Check md_entities columns  
  console.log('=== md_entities first record ===');
  const e1 = await query('md_entities', '*', 'limit=1');
  if (e1.length > 0) {
    console.log('  Columns:', Object.keys(e1[0]).join(', '));
    console.log('  Name:', e1[0].name || e1[0].legal_name || 'N/A');
    console.log('  ID:', e1[0].id);
    console.log('  tenant:', e1[0].tenant_id || 'N/A');
  }

  // Check the transporter c15acbfe...
  console.log('\n=== Transporter for JOs ===');
  const t = await query('md_entities', 'id, name, legal_name, phone', `id=eq.c15acbfe-efae-442d-b379-15d7f8ae043d`);
  if (t.length > 0) {
    console.log(`  FOUND: ${t[0].legal_name || t[0].name} | phone: ${t[0].phone || 'N/A'}`);
  } else {
    console.log('  NOT FOUND');
  }

  // Count all entities
  const entities = await query('md_entities', 'id, name, legal_name, phone', 'limit=20');
  console.log(`\n=== ALL ENTITIES (${entities.length}) ===`);
  for (const e of entities) {
    console.log(`  ${e.legal_name || e.name} | phone: ${e.phone || 'N/A'} | id: ${e.id}`);
  }

  // Check if md_drivers exists at all - try with RLS bypass
  console.log('\n=== md_drivers count ===');
  const dCount = await query('md_drivers', 'id', 'limit=100');
  console.log(`  Count: ${dCount.length}`);

  // Verify fleet data for specific JOs
  console.log('\n=== FLEET for JO 003-03 ===');
  const fleet = await query('md_fleets', 'id, plate_number, brand, model, fleet_type:md_fleet_types!fleet_type_id(type_name)', 
    `id=eq.55f5e3f6-0712-4a49-a21a-1e4eea57f276`);
  if (fleet.length > 0) {
    console.log(`  Plate: ${fleet[0].plate_number} | Brand: ${fleet[0].brand || 'N/A'} | Type: ${fleet[0].fleet_type?.type_name || 'N/A'}`);
  }

  // Show the actual JO with all data
  console.log('\n=== JO 003-03 full data ===');
  const jo = await query('job_orders', '*', `jo_number=eq.MBS-CUS00-0726-003-03`);
  if (jo.length > 0) {
    const j = jo[0];
    console.log(`  status: ${j.status}`);
    console.log(`  driver_id: ${j.driver_id}`);
    console.log(`  fleet_id: ${j.fleet_id}`);
    console.log(`  transporter_id: ${j.transporter_id}`);
    console.log(`  vendor_id: ${j.vendor_id}`);
    console.log(`  driver_phone: ${j.driver_phone || 'NULL'}`);
    console.log(`  driver_link_token: ${j.driver_link_token ? 'EXISTS' : 'NULL'}`);
    console.log(`  tracking_token: ${j.tracking_token ? 'EXISTS' : 'NULL'}`);
  }
}

main().catch(console.error);
