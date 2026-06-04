const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const { data: jos } = await supabase.from('job_orders').select('id, tenant_id').limit(1);
  const { data: locs } = await supabase.from('md_warehouse_locations').select('id').limit(1);
  const { data: manifests } = await supabase.from('wo_item_manifests').select('id').limit(1);

  if (!jos.length || !locs.length || !manifests.length) {
    console.log("Missing data for test");
    return;
  }

  const payload = {
    tenant_id: jos[0].tenant_id,
    job_order_id: jos[0].id,
    warehouse_location_id: locs[0].id,
    wo_item_manifest_id: manifests[0].id,
    quantity: 1,
    allocated_kg: 10,
    allocated_cbm: 1
  };

  console.log("Inserting:", payload);

  const { data, error } = await supabase
    .from('jo_warehouse_assignments')
    .insert([payload]);

  console.log("Error:", error);
  console.log("Data:", data);
  process.exit(0);
}

run();
