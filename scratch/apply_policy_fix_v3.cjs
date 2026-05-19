const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function applyPolicyFix() {
  const sql = `CREATE POLICY public_read_tracking_v2 ON job_tracking FOR SELECT TO public USING (true);`;
  
  const { data, error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
  
  if (error) console.error('Error applying policy:', error);
  else console.log('Policy applied successfully');
}

applyPolicyFix();
