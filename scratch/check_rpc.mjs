import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
    console.log('Checking RPC register_tenant_test...');
    // We can't view the code directly via JS client, but we can try to call it with dummy data to see if it exists
    const { error } = await supabase.rpc('register_tenant_test', {
        p_name: 'TEST',
        p_code: 'TEST001',
        p_email: 'test@example.com',
        p_full_name: 'Test Admin',
        p_tier: 'Starter'
    });
    
    if (error) {
        console.log('RPC Call Result:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('RPC does NOT exist.');
        } else {
            console.log('RPC exists but returned error (expected if data is invalid or duplicate).');
        }
    } else {
        console.log('RPC exists and succeeded.');
    }
}

checkRPC();
