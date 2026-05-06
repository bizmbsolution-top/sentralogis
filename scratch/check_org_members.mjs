import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrgMembers() {
    console.log('Checking organization_members...');
    const { data, error } = await supabase.from('organization_members').select('*').limit(5);
    if (error) {
        console.error(error);
    } else {
        console.log(data);
    }
}

checkOrgMembers();
