import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepRepair() {
  const email = 'admin@binanusantara.com';
  console.log(`--- Deep Repairing User: ${email} ---`);

  // 1. Create a FRESH Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: 'password_reset_berhasil_123',
    email_confirm: true,
    user_metadata: { role: 'tenant_admin' }
  });

  if (authError) {
    console.error('Auth Creation Failed:', authError.message);
    return;
  }

  const newId = authData.user.id;
  console.log('SUCCESS! New Auth ID created:', newId);

  // 2. Sync this new ID to Profiles and Tenants tables
  // Kita harus update ID lama ke ID baru di seluruh tabel terkait
  const oldId = '71518a2c-7907-4de9-832a-e8d593882f53';
  
  // Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ id: newId })
    .eq('email', email);

  if (profileError) console.error('Profile Sync Failed:', profileError.message);
  else console.log('Profile Synced.');

  // Update Tenant
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({ user_id: newId })
    .eq('user_id', oldId);

  if (tenantError) console.error('Tenant Sync Failed:', tenantError.message);
  else console.log('Tenant Synced.');

  console.log('\nUser identity fully recovered. You can now login with:');
  console.log('Email:', email);
  console.log('Password: password_reset_berhasil_123');
}

deepRepair();
