import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrgsCols() {
    console.log('Checking organizations columns...');
    const { data, error } = await supabase.from('organizations').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log(Object.keys(data[0] || {}));
    }
}

checkOrgsCols();
