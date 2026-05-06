import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertFleetNoType() {
    const orgId = '37eba673-b34a-4b28-96a9-000cff0280bd'; 
    const payload = {
        plate_number: "TEST NO TYPE",
        status: "active",
        organization_id: orgId
    };

    console.log('Testing insert into fleets without truck_type...');
    const { data, error } = await supabase.from('fleets').insert(payload).select();
    if (error) {
        console.error('Insert failed:', error.message);
    } else {
        console.log('Insert successful:', data);
        await supabase.from('fleets').delete().eq('id', data[0].id);
    }
}

testInsertFleetNoType();
