import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'; // Service role key from .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Searching for Job Order HALU-TPS-0526-001-01...");
    const { data: jo, error } = await supabase
        .from('job_orders')
        .select('*, md_drivers(*)')
        .eq('jo_number', 'HALU-TPS-0526-001-01')
        .maybeSingle();

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!jo) {
        console.error("Job Order not found!");
        return;
    }

    console.log("FOUND JOB ORDER:");
    console.log({
        id: jo.id,
        jo_number: jo.jo_number,
        status: jo.status,
        driver_id: jo.driver_id,
        driver_name: jo.md_drivers?.name,
        driver_phone: jo.md_drivers?.phone,
        driver_whatsapp: jo.md_drivers?.whatsapp,
        driver_link_token: jo.driver_link_token,
        wa_link_sent_at: jo.wa_link_sent_at
    });
}

main();
