import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. All profiles with HQ-related roles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, tenant_id, email')
    .order('role');
  
  console.log('=== ALL PROFILES ===');
  profiles?.forEach(p => console.log(`  ${p.email || '(no email)'} | role=${p.role} | tenant=${p.tenant_id?.substring(0,8)}...`));

  // 2. Check extra_costs with need_approval - what tenants do they belong to?
  console.log('\n=== EXTRA_COSTS → which tenants have pending costs? ===');
  const { data: pendingCosts } = await supabase
    .from('extra_costs')
    .select('jo_id')
    .eq('status', 'need_approval');
  
  if (pendingCosts?.length) {
    const joIds = [...new Set(pendingCosts.map(c => c.jo_id))];
    const { data: jos } = await supabase
      .from('job_orders')
      .select('id, jo_number, tenant_id, base_price, purchase_price, status')
      .in('id', joIds);
    
    console.log(`Found ${pendingCosts.length} pending costs across ${jos?.length} JOs:`);
    jos?.forEach(j => console.log(`  ${j.jo_number}: tenant=${j.tenant_id?.substring(0,8)}..., purchase=${j.purchase_price}, base=${j.base_price}`));
    
    // Check tenants
    const tenantIds = [...new Set(jos?.map(j => j.tenant_id))];
    const { data: tenantProfiles } = await supabase
      .from('profiles')
      .select('email, role, tenant_id')
      .in('tenant_id', tenantIds);
    
    console.log('\nUsers with access to these tenants:');
    tenantProfiles?.forEach(p => console.log(`  ${p.email} | role=${p.role} | tenant=${p.tenant_id?.substring(0,8)}...`));
  }

  // 3. Count all extra_costs by status
  console.log('\n=== EXTRA_COSTS STATUS DISTRIBUTION ===');
  const { data: allCosts } = await supabase.from('extra_costs').select('status');
  const statusCounts = {};
  allCosts?.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  console.log(statusCounts);
}

check();
