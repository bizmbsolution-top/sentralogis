import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function test() {
  const { data, error } = await supabase.from('crm_quotations').select('*, crm_deals(title, entity_id, md_entities(name, billing_address, phone, email)), tenants(name, company_name, company_address, company_phone, logo_url)').limit(1);
  console.log('Error:', JSON.stringify(error, null, 2));
}

test();
