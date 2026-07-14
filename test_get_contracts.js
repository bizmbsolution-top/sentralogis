const fs = require('fs');

let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  const res = await fetch(`${supabaseUrl}/rest/v1/md_storage_contracts?select=*,md_entities!md_storage_contracts_customer_id_fkey(name,legal_name,entity_code),md_contract_warehouses(id,warehouse_id,committed_space,uom_space,md_warehouses(name,code))&tenant_id=eq.78846049-fb63-45a9-93da-3af3fea5b587`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Output:', text.slice(0, 500));
}

test();
