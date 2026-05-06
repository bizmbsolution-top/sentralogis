import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
    console.log('Checking column types...');
    // We can try to insert a wrong type to see the error message
    const { error } = await supabase.from('drivers').insert({ nik: 'not_a_number' }).select();
    if (error) {
        console.log('Driver insert with string nik error:', error.message);
    }
}

checkTypes();
