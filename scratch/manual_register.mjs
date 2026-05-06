import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function manualRegister() {
  const email = 'manual_test@example.com';
  const tenantCode = 'MANUAL001';
  const warehouseId = '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';

  console.log('--- Manual Registration Test ---');

  // 1. Create Auth User
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Manual Admin', role: 'tenant_admin' }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      console.log('User already exists, proceeding...');
    } else {
      console.error('Auth Error:', authError);
      return;
    }
  }

  const userId = authData?.user?.id || (await supabase.from('profiles').select('id').eq('email', email).single()).data?.id;
  
  if (!userId) {
     console.error('Could not get User ID');
     return;
  }

  console.log('User ID:', userId);

  // 2. Upsert Profile
  const { error: profError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    full_name: 'Manual Admin',
    role: 'tenant_admin',
    is_active: true
  });

  if (profError) {
    console.error('Profile Error:', profError);
    return;
  }

  // 3. Insert Tenant
  const { error: tenantError } = await supabase.from('tenants').insert({
    name: 'Manual Tenant',
    tenant_code: tenantCode,
    user_id: userId,
    warehouse_id: warehouseId,
    status: 'active',
    subscription_tier: 'Starter',
    token_balance: 100
  });

  if (tenantError) {
    console.error('Tenant Error:', tenantError);
    return;
  }

  console.log('Success! Manual Registration Complete.');
}

manualRegister();
