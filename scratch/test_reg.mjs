import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRegistration() {
  console.log('--- Testing Registration RPC ---');
  const { data, error } = await supabase.rpc('register_tenant_test', {
    p_tenant_name: 'Test Tenant',
    p_tenant_code: 'TEST001',
    p_admin_email: 'test_tenant@example.com',
    p_admin_full_name: 'Test Admin',
    p_subscription_tier: 'premium'
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success:', data);
  }
}

testRegistration();
