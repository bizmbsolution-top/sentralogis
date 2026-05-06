import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function repairUser() {
  const email = 'admin@binanusantara.com';
  const profileId = '71518a2c-7907-4de9-832a-e8d593882f53';
  
  console.log(`--- Repairing User: ${email} ---`);

  // 1. Create Auth User with the SAME ID as Profile
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    id: profileId, // Kita samakan ID-nya agar sinkron
    email: email,
    password: 'password_awal_123',
    email_confirm: true,
    user_metadata: { role: 'tenant_admin' }
  });

  if (authError) {
    console.error('FAILED to create Auth user:', authError.message);
  } else {
    console.log('SUCCESS! Auth user created with ID:', authUser.user.id);
    console.log('Now you can Reset Password from Dashboard.');
  }
}

repairUser();
