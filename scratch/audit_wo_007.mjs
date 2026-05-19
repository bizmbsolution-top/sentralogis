
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://nsvkewvmzivudkcczhnk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function auditWO() {
    console.log('--- AUDIT WO/05/2026/007 ---');
    
    const { data: wo } = await supabase.from('work_orders').select('*').eq('wo_number', 'WO/05/2026/007').single();
    if (!wo) return console.log('WO not found');

    const { data: items } = await supabase.from('wo_items').select('*').eq('wo_id', wo.id);
    const itemIds = items.map(i => i.id);

    const { data: jos } = await supabase.from('job_orders').select('*').in('wo_item_id', itemIds);
    
    console.log('\n--- JOB ORDERS DETAIL ---');
    for (const j of jos) {
        console.log(`JO: ${j.jo_number} | Status: ${j.status} | FleetID: ${j.fleet_id}`);
        if (j.fleet_id) {
            const { data: fleet } = await supabase.from('md_fleets').select('plate_number').eq('id', j.fleet_id).single();
            console.log(`  -> Actual Plate from md_fleets: ${fleet?.plate_number}`);
        }
    }
}

auditWO();
