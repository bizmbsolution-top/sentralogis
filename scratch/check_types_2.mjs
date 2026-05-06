import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes2() {
    console.log('Checking column types...');
    const { error } = await supabase.from('drivers').insert({ name: 'Test', nik: 'not_a_number' }).select();
    if (error) {
        console.log('Driver insert with string nik error:', error.message);
    } else {
        console.log('Insert successful with string nik');
    }
}

checkTypes2();
