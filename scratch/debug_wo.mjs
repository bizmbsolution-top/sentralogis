
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://nsvkewvmzivudkcczhnk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8');

async function testQuery() {
    const { data, error } = await supabase.from("wo_items").select(`
        *,
        work_orders!inner (
            id, wo_number, status, tenant_id
        ),
        job_orders (
            id, wo_item_id, fleet_id, driver_id, jo_number, status, 
            md_fleets:fleet_id (plate_number, entity_id, fleet_type_id),
            md_drivers:md_drivers!fk_job_orders_md_driver (id, name, phone)
        )
    `).eq('work_orders.wo_number', 'WO/05/2026/006');

    if (error) {
        console.error("QUERY ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("QUERY SUCCESS, DATA:", JSON.stringify(data, null, 2));
    }
}

testQuery();
