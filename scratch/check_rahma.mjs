import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  const { data: user } = await supabase.from('tenant_users').select('role_code').ilike('full_name', '%RAHMA%').maybeSingle();
  const { data: handovers } = await supabase.from('wo_items').select('id, status').eq('status', 'handover_pending');
  
  console.log('User Role:', user?.role_code);
  console.log('Handovers count:', handovers?.length);
  if (handovers?.length > 0) {
      console.log('Sample Handover ID:', handovers[0].id);
  }
}

check()
