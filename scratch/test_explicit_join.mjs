import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('--- Checking Constraints ---');
  // We can't query information_schema directly easily via client, 
  // but we can try to guess or use a specialized RPC if it exists.
  // Let's try to join via user_id explicitly in select.
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*, profiles!user_id(email, full_name)');

  if (error) {
    console.error('Explicit Join Error:', error.message);
  } else {
    console.log('Explicit Join Success!');
  }
}

checkConstraints();
