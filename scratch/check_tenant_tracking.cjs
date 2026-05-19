const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkTenants() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('jo_number, tenant_id')
    .eq('jo_number', 'SL-BYD PD INDAH-0526-001/TR01/ADA-001');

  console.log('JO Tenant:', data);
  
  const { data: tracking } = await supabase
    .from('job_tracking')
    .select('job_order_id, latitude, longitude')
    .eq('job_order_id', data?.[0]?.id)
    .limit(1);
    
  console.log('Tracking sample:', tracking);
}

checkTenants();
