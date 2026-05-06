import { registerNewTenant } from '../lib/actions/tenantActions.js'; // Wait, it's a server action, might not work in node directly easily due to 'use server'

// I'll just write a script that does what registerNewTenant does.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testServerActionLogic() {
  console.log('--- Testing Server Action Logic ---');
  const email = 'new_real_tenant@example.com';
  
  // 1. Create user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
  } else {
    console.log('Auth User Created:', authUser.user.id);
  }
}

testServerActionLogic();
