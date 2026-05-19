import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkJobRoutes() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'job_routes' });
  if (error) {
     // fallback if RPC doesn't exist
     const { data: cols, error: err2 } = await supabase.from('job_routes').select('*').limit(1);
     if (err2) console.error(err2);
     else console.log('Sample Row:', cols[0]);
  } else {
     console.log('Columns:', data);
  }
}

checkJobRoutes();
