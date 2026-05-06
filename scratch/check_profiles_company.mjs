import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesWithCompany() {
    console.log('Checking profiles with company_id...');
    const { data, error } = await supabase.from('profiles').select('email, company_id').not('company_id', 'is', null);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkProfilesWithCompany();
