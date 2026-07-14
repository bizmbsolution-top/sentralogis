require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('md_storage_contracts')
    .select(`
      *,
      md_entities!md_storage_contracts_customer_id_fkey (name, code),
      md_contract_warehouses (
        id,
        warehouse_id,
        committed_space,
        uom_space,
        md_warehouses (name, code)
      )
    `)
    .limit(1);

  if (error) {
    console.log('Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success, rows:', data.length);
  }
}

test();
