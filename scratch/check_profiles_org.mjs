import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesWithOrg() {
    console.log('Checking profiles with organization_id...');
    const { data, error } = await supabase.from('profiles').select('email, organization_id').not('organization_id', 'is', null);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkProfilesWithOrg();
