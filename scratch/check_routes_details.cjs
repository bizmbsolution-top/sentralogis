const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkDetails() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'job_routes' });
  
  if (error) {
    // If RPC doesn't exist, try another way
    console.log('RPC failed, trying query...');
    const { data: cols, error: colErr } = await supabase
      .from('job_routes')
      .select('*')
      .limit(1);
      
    if (colErr) console.error(colErr);
    else console.log('Sample Row:', JSON.stringify(cols[0], null, 2));
  } else {
    console.log('Table Info:', data);
  }
}

checkDetails();
