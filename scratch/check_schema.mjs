import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking schemas...');
    const tables = ['fleets', 'drivers', 'companies'];
    for (const table of tables) {
        console.log(`\n--- Schema for ${table} ---`);
        // We can't directly get schema with anon key easily via API, but we can try to insert an empty object to see the error message which often reveals required fields
        const { error } = await supabase.from(table).insert({}).select();
        if (error) {
            console.log(`Insert test on ${table} failed (expected): ${error.message}`);
            console.log(`Error code: ${error.code}`);
            console.log(`Hint: ${error.hint}`);
            console.log(`Details: ${error.details}`);
        }
    }
}

checkSchema();
