import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkSpecificID() {
  const { data, error } = await supabase
    .from('job_routes')
    .select('*')
    .eq('job_order_id', 'eb14ee67-eeca-46c7-9a5e-cba920ad3a30')
    .order('sequence', { ascending: true });
  
  if (error) {
     console.error('Specific Fetch Error:', error);
  } else {
     console.log('Specific Fetch Success, Rows:', data.length);
  }
}

checkSpecificID();
