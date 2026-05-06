import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesInOrg() {
    const orgId = '37eba673-b34a-4b28-96a9-000cff0280bd';
    console.log(`Checking profiles in org ${orgId}...`);
    const { data, error } = await supabase.from('profiles').select('email').eq('organization_id', orgId);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkProfilesInOrg();
