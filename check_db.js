require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const userId = 'efd3f9bd-d7e4-4336-8057-b4844acf830d';
  
  const { data: tenant } = await supabase.from('tenants').select('*').eq('user_id', userId).single();
  console.log("Tenant Owner Role Code:", tenant?.role_code);
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  console.log("Profile Role:", profile?.role);
}

check();
