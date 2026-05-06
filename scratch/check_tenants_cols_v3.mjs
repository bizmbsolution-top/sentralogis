import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantsCols() {
    console.log('Listing all columns in tenants...');
    // Try to get one row, if empty, we might not see all columns easily without RPC or psql
    // But we can try to insert an almost valid row to see what's missing
    const payload = {
        name: 'TEST',
        tenant_code: 'TEST001',
        status: 'active',
        subscription_tier: 'Starter',
        token_balance: 100,
        warehouse_id: '00000000-0000-0000-0000-000000000000' // dummy uuid
    };
    const { error } = await supabase.from('tenants').insert(payload).select();
    if (error) {
        console.log('Insert Error:', error.message);
        console.log('Error Code:', error.code);
    } else {
        console.log('Insert successful with dummy warehouse_id');
    }
}

checkTenantsCols();
