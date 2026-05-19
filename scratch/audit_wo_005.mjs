
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://nsvkewvmzivudkcczhnk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function auditWO() {
    console.log('--- AUDIT WO/05/2026/005 ---');
    
    // 1. Find the Work Order
    const { data: wo, error: woError } = await supabase
        .from('work_orders')
        .select('*')
        .eq('wo_number', 'WO/05/2026/005')
        .single();
    
    if (woError) {
        console.error('WO Error:', woError);
        return;
    }
    console.log('Work Order ID:', wo.id);

    // 2. Find WO Items
    const { data: items, error: itemError } = await supabase
        .from('wo_items')
        .select('*')
        .eq('wo_id', wo.id);
    
    if (itemError) {
        console.error('Item Error:', itemError);
        return;
    }
    console.log('Items Count:', items.length);

    // 3. Find Job Orders
    const itemIds = items.map(i => i.id);
    const { data: jos, error: joError } = await supabase
        .from('job_orders')
        .select('*')
        .in('wo_item_id', itemIds);
    
    if (joError) {
        console.error('JO Error:', joError);
        return;
    }
    
    console.log('\n--- JOB ORDERS DETAIL ---');
    jos.forEach(j => {
        const item = items.find(i => i.id === j.wo_item_id);
        console.log(`JO: ${j.jo_number}`);
        console.log(`  Status: ${j.status}`);
        console.log(`  Fleet ID: ${j.fleet_id}`);
        console.log(`  Driver ID: ${j.driver_id}`);
        console.log(`  Item Data Plate: ${item?.item_data?.plate_number}`);
    });

    // 4. Check Fleets if they exist
    const fleetIds = jos.map(j => j.fleet_id).filter(Boolean);
    if (fleetIds.length > 0) {
        const { data: fleets } = await supabase.from('md_fleets').select('*').in('id', fleetIds);
        console.log('\n--- FLEETS DATA ---');
        console.table(fleets?.map(f => ({ id: f.id, plate: f.plate_number })));
    } else {
        console.log('\n--- NO FLEET ASSIGNED TO ANY JO ---');
    }
}

auditWO();
