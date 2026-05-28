import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking if md_warehouses table exists...");
    const { data, error } = await supabase
        .from('md_warehouses')
        .select('id')
        .limit(1);

    if (error) {
        console.error("Error (table probably does not exist or access error):", error.message);
    } else {
        console.log("SUCCESS: md_warehouses exists! Sample data:", data);
    }
}

main();
