import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResetTable() {
    console.log('Checking reset_password_requests...');
    const { data, error } = await supabase.from('reset_password_requests').select('*').limit(1);
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Table exists and is accessible.');
    }
}

checkResetTable();
