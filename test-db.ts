import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tenantId = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff';
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
  
  console.log("Tenant from DB:", tenant);
}

run();
