import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    console.log('Listing tables via information_schema...');
    // We can use a raw query if we have an RPC, but we don't.
    // Let's try to see if there's a 'user_organizations' table or similar.
    const commonTables = [
        'organizations', 'profiles', 'fleets', 'drivers', 'companies',
        'user_organizations', 'tenant_users', 'organization_members'
    ];
    for (const table of commonTables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table ${table} exists.`);
        }
    }
}

listTables();
