import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificProfile() {
    const id = '8a0be7c7-281c-4ea3-98c1-ad6e4ab23d78';
    console.log(`Checking profile ${id}...`);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id);
    if (error) {
        console.error(error.message);
    } else {
        console.log('Rows found:', data.length);
        console.log(data);
    }
}

checkSpecificProfile();
