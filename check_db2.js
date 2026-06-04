require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const tenantId = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff';
  
  const { data: tenant } = await supabase.from('tenants').select('id, name, token_balance').eq('id', tenantId).single();
  console.log("Tenant:", tenant);
}

check();
