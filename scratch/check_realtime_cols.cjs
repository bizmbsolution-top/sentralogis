const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkRealtime() {
  const { data: drivers, error: dError } = await supabase.from('md_drivers').select('*').limit(1);
  const { data: fleets, error: fError } = await supabase.from('md_fleets').select('*').limit(1);
  
  if (drivers) console.log('md_drivers cols:', Object.keys(drivers[0]));
  if (fleets) console.log('md_fleets cols:', Object.keys(fleets[0]));
}

checkRealtime();
