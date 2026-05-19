const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkAllTracking() {
  const { data, error } = await supabase
    .from('job_tracking')
    .select('*')
    .eq('job_order_id', '72c3bf86-ae2b-4313-a63f-41df7994636c')
    .order('created_at', { ascending: false });

  console.log('Tracking History for SL-BYD PD INDAH:');
  data.forEach(t => {
    console.log(`${t.created_at} | Lat: ${t.latitude} | Lng: ${t.longitude}`);
  });
}

checkAllTracking();
