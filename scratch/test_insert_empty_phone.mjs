import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsertEmptyPhone() {
    const payload = {
        name: "TEST EMPTY PHONE",
        phone: "",
        status: "active"
    };

    console.log('Testing insert into drivers with phone as empty string...');
    const { data, error } = await supabase.from('drivers').insert(payload).select();
    if (error) {
        console.error('Insert failed:', error.message);
    } else {
        console.log('Insert successful:', data);
        await supabase.from('drivers').delete().eq('id', data[0].id);
    }
}

testInsertEmptyPhone();
