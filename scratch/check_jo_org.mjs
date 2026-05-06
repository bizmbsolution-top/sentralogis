import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJOOrg() {
    console.log('Checking job_orders schema...');
    // Try to insert a JO with null organization_id
    const payload = {
        jo_number: "TEST-JO-" + Date.now(),
        status: "draft",
        organization_id: null
    };
    const { error } = await supabase.from('job_orders').insert(payload).select();
    if (error) {
        console.log('JO insert error:', error.message);
    } else {
        console.log('JO insert successful with null org_id');
    }
}

checkJOOrg();
