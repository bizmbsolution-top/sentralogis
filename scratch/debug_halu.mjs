import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
  console.log('--- DEBUG TENANT HALU-001 ---');
  const { data: tenant } = await supabase.from('tenants').select('*').eq('tenant_code', 'HALU-001').single();
  console.log('TENANT:', tenant);
  
  if (tenant?.user_id) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', tenant.user_id).single();
    console.log('PROFILE BY ID:', profile);
  }

  if (tenant?.admin_email) {
    const { data: profileByEmail } = await supabase.from('profiles').select('*').eq('email', tenant.admin_email).single();
    console.log('PROFILE BY EMAIL:', profileByEmail);
  }
}

debug();
