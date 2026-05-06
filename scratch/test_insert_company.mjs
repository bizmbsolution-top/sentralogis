import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertCompany() {
    const orgId = '37eba673-b34a-4b28-96a9-000cff0280bd'; 
    const payload = {
        name: "TEST COMPANY",
        type: "vendor",
        organization_id: orgId
    };

    console.log('Testing insert into companies...');
    const { data, error } = await supabase.from('companies').insert(payload).select();
    if (error) {
        console.error('Insert failed:', error.message);
        console.error('Code:', error.code);
        console.error('Details:', error.details);
    } else {
        console.log('Insert successful:', data);
        await supabase.from('companies').delete().eq('id', data[0].id);
    }
}

testInsertCompany();
