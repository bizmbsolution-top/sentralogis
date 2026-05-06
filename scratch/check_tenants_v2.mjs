import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
    console.log('Checking tenants...');
    const { data, error } = await supabase.from('tenants').select('tenant_code');
    if (error) {
        console.error(error);
    } else {
        console.log('Existing codes:', data.map(t => t.tenant_code));
    }
}

checkTenants();
