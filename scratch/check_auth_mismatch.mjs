import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPending() {
  console.log('--- Checking Pending Requests vs Auth Users ---');
  
  const { data: requests } = await supabase.from('reset_password_requests').select('admin_email, status').eq('status', 'pending');
  console.log('Pending Requests:', requests);

  const { data: { users } } = await supabase.auth.admin.listUsers();
  console.log('Auth Users Count:', users.length);
  
  if (requests) {
    requests.forEach(req => {
      const found = users.find(u => u.email === req.admin_email);
      console.log(`Email [${req.admin_email}] exists in Auth? ${found ? 'YES (ID: '+found.id+')' : 'NO'}`);
    });
  }
}

checkPending();
