const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('wo_items').select('item_data').not('item_data', 'is', null).limit(2);
  console.log('Error:', error?.message);
  console.log('Data:', JSON.stringify(data, null, 2));
}
check();
