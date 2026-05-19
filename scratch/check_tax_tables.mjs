import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Assuming a helper RPC or just try fetching from likely names
    
    // If RPC doesn't exist, try common names
    const tableNames = ['md_taxes', 'finance_taxes', 'taxes', 'md_tax_rates'];
    
    for (const name of tableNames) {
        const { data, error } = await supabase.from(name).select('*').limit(1);
        if (!error) {
            console.log(`Table found: ${name}`);
            console.log(data);
        } else {
            console.log(`Table not found: ${name} (${error.message})`);
        }
    }
}

checkTables();
