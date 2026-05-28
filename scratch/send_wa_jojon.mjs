import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'; // Service role key from .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Starting WA simulation for driver JOJON, JO: HALU-TPS-0526-001-01...");
    
    // 1. Find the JO
    const { data: jo, error: findError } = await supabase
        .from('job_orders')
        .select('*, md_drivers(*)')
        .eq('jo_number', 'HALU-TPS-0526-001-01')
        .maybeSingle();

    if (findError || !jo) {
        console.error("Failed to find JO:", findError || "Not found");
        return;
    }

    const phone = jo.md_drivers?.phone || '085218129978';
    const driverName = jo.md_drivers?.name || 'JOJON';
    const baseUrl = 'https://www.sentralogis.com';
    const link = `${baseUrl}/jo/${jo.driver_link_token || jo.id}`;
    
    console.log(`[MOCK WA] Sending message to ${driverName} (${phone}):`);
    console.log(`"Halo ${driverName}, berikut link untuk konfirmasi tugas Anda (${jo.jo_number}): ${link}"`);

    // 2. Update wa_link_sent_at in database
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('job_orders')
        .update({ wa_link_sent_at: now })
        .eq('id', jo.id);

    if (updateError) {
        console.error("Failed to update wa_link_sent_at:", updateError);
        return;
    }

    console.log(`Successfully updated wa_link_sent_at to ${now} for JO: ${jo.jo_number}`);
}

main();
