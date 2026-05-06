import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAuthUser() {
  console.log('--- Verifying Auth User ---');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const testUser = users.find(u => u.email === 'test_tenant@example.com');
    if (testUser) {
      console.log('User Found:', testUser.id, testUser.email);
    } else {
      console.log('User NOT found in Auth.');
    }
  }
}

verifyAuthUser();
