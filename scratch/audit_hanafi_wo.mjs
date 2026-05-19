import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function auditHanafi() {
  console.log('=== AUDITING WORK ORDER ===');
  const { data: wo, error: woErr } = await supabase
    .from('work_orders')
    .select('*')
    .eq('wo_number', 'SL-HANAFI-0526-001');

  if (woErr) {
    console.error('Error fetching work order:', woErr);
    return;
  }
  console.log('Work Order:', wo);

  if (wo && wo.length > 0) {
    const woId = wo[0].id;
    console.log('\n=== AUDITING WO ITEMS ===');
    const { data: items, error: itemsErr } = await supabase
      .from('wo_items')
      .select('*')
      .eq('wo_id', woId);

    if (itemsErr) {
      console.error('Error fetching wo items:', itemsErr);
      return;
    }
    console.log('WO Items:', items);

    for (const item of items) {
      console.log(`\n=== AUDITING JOB ORDERS FOR ITEM ${item.item_code} (ID: ${item.id}) ===`);
      const { data: jos, error: josErr } = await supabase
        .from('job_orders')
        .select('*')
        .eq('wo_item_id', item.id);

      if (josErr) {
        console.error('Error fetching job orders:', josErr);
        continue;
      }
      console.log('Job Orders Count:', jos.length);
      console.log('Job Orders Details:', jos.map(j => ({
        id: j.id,
        jo_number: j.jo_number,
        status: j.status,
        transporter_id: j.transporter_id,
        fleet_id: j.fleet_id,
        driver_id: j.driver_id,
        driver_phone: j.driver_phone
      })));
    }
  }
}

auditHanafi();
