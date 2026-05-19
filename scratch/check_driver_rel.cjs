const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkDrivers() {
  // Test explicit join
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, driver:md_drivers!driver_id(name)')
    .limit(1);
  
  if (error) {
    console.log('Error with md_drivers!driver_id:', error);
    // Try another common name
    const { error: error2 } = await supabase
      .from('job_orders')
      .select('id, driver:md_drivers!job_orders_driver_id_fkey(name)')
      .limit(1);
    console.log('Error with fkey name:', error2);
  } else {
    console.log('Success with md_drivers!driver_id');
  }
}

checkDrivers();
