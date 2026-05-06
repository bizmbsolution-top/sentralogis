import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkId() {
  const targetId = '191edf81-400c-4551-8c19-2bcb8a511835';
  
  console.log('--- INVESTIGASI ID PROFIL ---');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', targetId).maybeSingle();
  console.log('ISI PROFIL:', profile);

  const { data: tenants } = await supabase.from('tenants').select('*').eq('user_id', targetId);
  console.log('TENANT TERHUBUNG:', tenants);

  const { data: halu } = await supabase.from('tenants').select('*').eq('tenant_code', 'HALU-001').maybeSingle();
  console.log('DATA HALU-001 SAAT INI:', halu);
}

checkId();
