const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkRLSDetail() {
  const { data, error } = await supabase.rpc('exec_sql_manual', { 
    sql_query: "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'job_tracking'" 
  });
  console.log('RLS Status:', data);
  
  const { data: policies } = await supabase.rpc('exec_sql_manual', { 
    sql_query: "SELECT * FROM pg_policies WHERE tablename = 'job_tracking'" 
  });
  console.log('Policies:', policies);
}

checkRLSDetail();
