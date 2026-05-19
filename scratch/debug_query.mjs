
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://nsvkewvmzivudkcczhnk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g');

async function testQuery() {
    console.log("Testing query without license_type...");
    const { data, error } = await supabase.from("wo_items").select(`
        *,
        wo:work_orders!inner (
            id, wo_number, status, tenant_id
        ),
        job_orders (
            id, 
            md_drivers:md_drivers!fk_job_orders_md_driver (id, name, phone)
        )
    `).limit(1);

    if (error) {
        console.error("QUERY ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("QUERY SUCCESS, DATA COUNT:", data.length);
    }
}

testQuery();
