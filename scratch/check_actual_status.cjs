const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkStatus() {
  const { data: wo, error: woErr } = await supabase
    .from('work_orders')
    .select('id, wo_number, status')
    .eq('wo_number', 'SL-ARISTA-0526-001')
    .single();

  if (wo) {
    console.log('Work Order:', wo);
    const { data: items, error: itemErr } = await supabase
      .from('wo_items')
      .select('id, item_code, status')
      .eq('work_order_id', wo.id);
    
    console.log('WO Items:', items);

    const { data: jos, error: joErr } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, wo_item_id')
      .in('wo_item_id', items.map(i => i.id));
    
    console.log('Job Orders:', jos);
  } else {
    console.log('WO not found or error:', woErr);
  }
}

checkStatus();
