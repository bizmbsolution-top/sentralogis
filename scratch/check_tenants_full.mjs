import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantsFull() {
    console.log('Checking tenants table structure...');
    // We can try to query one row if it exists, or just look at information_schema via a trick.
    // Actually, I can try to insert a dummy row and catch the error to see the columns.
    const { error } = await supabase.from('tenants').insert({}).select();
    if (error) {
        console.log('Insert Error (contains column names if violation):', error.message);
    }
}

checkTenantsFull();
