
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://nsvkewvmzivudkcczhnk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8');

async function debugEntity() {
    const { data: entity } = await supabase.from("md_entities").select("*").eq('id', 'f730cd13-b10a-40ee-a6c1-58952eebefd9').single();
    console.log("ENTITY f730cd13:", entity);

    const { data: entity2 } = await supabase.from("md_entities").select("*").eq('id', '7360acc3-0e74-4eaa-8dc4-0ffc9eb5a8b7').single();
    console.log("ENTITY 7360acc3:", entity2);
}

debugEntity();
