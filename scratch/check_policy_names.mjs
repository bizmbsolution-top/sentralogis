import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkAllPolicyNames() {
  const { data, error } = await supabase.rpc('exec_sql_manual', { 
    sql_query: "SELECT policyname FROM pg_policies WHERE tablename = 'job_routes'" 
  });
  
  if (error) {
     console.error(error);
  } else {
     console.log('Policy Names:', data.map(p => p.policyname));
  }
}

checkAllPolicyNames();
