require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('Fixing orphaned JO statuses...');
  
  // Fix 1: driver_response='accepted', started_at IS NULL, status in ('pending', 'assigned') => 'ORDER DITERIMA'
  const { data: d1, error: e1 } = await supabase
    .from('job_orders')
    .update({ status: 'ORDER DITERIMA' })
    .in('status', ['pending', 'assigned'])
    .eq('driver_response', 'accepted')
    .is('started_at', null)
    .select('id, jo_number');
    
  if (e1) console.error('Error 1:', e1);
  else console.log('Fixed to ORDER DITERIMA:', d1.length, 'records');

  // Fix 2: driver_response='accepted', started_at IS NOT NULL, status in ('pending', 'assigned') => 'DALAM PERJALANAN'
  const { data: d2, error: e2 } = await supabase
    .from('job_orders')
    .update({ status: 'DALAM PERJALANAN' })
    .in('status', ['pending', 'assigned', 'ORDER DITERIMA'])
    .eq('driver_response', 'accepted')
    .not('started_at', 'is', null)
    .select('id, jo_number, status');
    
  if (e2) console.error('Error 2:', e2);
  else console.log('Fixed to DALAM PERJALANAN:', d2.length, 'records');
}

fix();
