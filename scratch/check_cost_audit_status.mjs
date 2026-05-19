import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. Check extra_costs schema
  const { data: ecRow } = await supabase.from('extra_costs').select('*').limit(1).single();
  if (ecRow) {
    console.log('=== EXTRA_COSTS COLUMNS ===');
    console.log(Object.keys(ecRow));
    console.log('\nSample row:', JSON.stringify(ecRow, null, 2));
  }

  // 2. Check if FK exists by trying a relational query
  console.log('\n=== FK TEST: extra_costs → job_orders ===');
  const { data: fkTest, error: fkError } = await supabase
    .from('extra_costs')
    .select('id, jo_id, job_orders(id, jo_number)')
    .limit(1);
  
  if (fkError) {
    console.log('FK NOT FOUND (expected if no FK):', fkError.message);
  } else {
    console.log('FK EXISTS! Result:', JSON.stringify(fkTest, null, 2));
  }

  // 3. Check job_orders has purchase_price
  console.log('\n=== JOB_ORDERS: purchase_price check ===');
  const { data: joRow } = await supabase.from('job_orders').select('id, jo_number, base_price, purchase_price, status').limit(3);
  if (joRow) {
    joRow.forEach(j => console.log(`  ${j.jo_number}: base=${j.base_price}, purchase=${j.purchase_price}, status=${j.status}`));
  }

  // 4. Check tenant for fin@halu.com
  console.log('\n=== USER: fin@halu.com profile ===');
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, tenant_id, email').eq('email', 'fin@halu.com');
  if (profiles?.length) {
    console.log(JSON.stringify(profiles[0], null, 2));
    
    // Check JOs for this tenant
    const tenantId = profiles[0].tenant_id;
    const { data: tenantJos, error: tjErr } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, base_price, purchase_price')
      .eq('tenant_id', tenantId)
      .limit(5);
    
    console.log('\n=== TENANT JOs (first 5) ===');
    tenantJos?.forEach(j => console.log(`  ${j.jo_number}: status=${j.status}, base=${j.base_price}, purchase=${j.purchase_price}`));
    
    // Check extra_costs for tenant JOs
    if (tenantJos?.length) {
      const joIds = tenantJos.map(j => j.id);
      const { data: costs } = await supabase
        .from('extra_costs')
        .select('id, jo_id, cost_type, amount, status, charge_type, is_billable, paid_by_sbu')
        .in('jo_id', joIds)
        .neq('status', 'draft');
      
      console.log(`\n=== EXTRA COSTS for tenant (non-draft): ${costs?.length || 0} rows ===`);
      costs?.forEach(c => console.log(`  JO=${c.jo_id?.substring(0,8)}..., type=${c.cost_type}, amt=${c.amount}, status=${c.status}, billable=${c.is_billable}, paid_by_sbu=${c.paid_by_sbu}`));
    }
  }
}

check();
