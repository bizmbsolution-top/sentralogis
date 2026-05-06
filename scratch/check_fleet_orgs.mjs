import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFleetOrgs() {
    console.log('Checking fleet organization_ids...');
    const { data, error } = await supabase.from('fleets').select('plate_number, organization_id').limit(10);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkFleetOrgs();
