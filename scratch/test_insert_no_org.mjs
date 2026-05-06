import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertNoOrg() {
    const payload = {
        plate_number: "TEST NO ORG",
        truck_type: "CDE",
        status: "active"
    };

    console.log('Testing insert into fleets without organization_id...');
    const { data, error } = await supabase.from('fleets').insert(payload).select();
    if (error) {
        console.error('Insert failed:', error.message);
    } else {
        console.log('Insert successful:', data);
        await supabase.from('fleets').delete().eq('id', data[0].id);
    }
}

testInsertNoOrg();
