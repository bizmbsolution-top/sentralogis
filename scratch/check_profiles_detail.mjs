import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesDetail() {
    console.log('Checking profiles detail...');
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(data[0], null, 2));
    }
}

checkProfilesDetail();
