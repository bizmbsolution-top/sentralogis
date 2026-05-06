import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    console.log('Checking unique roles in profiles...');
    const { data, error } = await supabase.from('profiles').select('role');
    if (error) {
        console.error(error);
    } else {
        const roles = [...new Set(data.map(p => p.role))];
        console.log('Existing roles:', roles);
    }
}

checkRoles();
