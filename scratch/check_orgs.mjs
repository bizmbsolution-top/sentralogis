import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrgs() {
    console.log('Checking organizations...');
    const { data, error } = await supabase.from('organizations').select('*').limit(5);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkOrgs();
