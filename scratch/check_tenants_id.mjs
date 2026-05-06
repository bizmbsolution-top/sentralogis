import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantsId() {
    const id = '8a0be7c7-281c-4ea3-98c1-ad6e4ab23d78';
    console.log(`Checking tenants table for id ${id}...`);
    const { data, error } = await supabase.from('tenants').select('*').eq('id', id);
    if (error) {
        console.error(error.message);
    } else {
        console.log('Rows found:', data.length);
        console.log(data);
    }
}

checkTenantsId();
