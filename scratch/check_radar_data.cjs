const { createClient } = require('@supabase/supabase-js');

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key);

async function checkActiveJOs() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status, fleet_id, driver_id')
    .not('status', 'in', '("completed", "PEKERJAAN SELESAI", "verified", "ready_for_billing", "awaiting_audit", "cancelled", "PAID", "paid", "INVOICED", "invoiced")');

  if (error) {
    console.error('Error fetching JOs:', error);
    return;
  }

  console.log('Total Active JOs Found:', data.length);
  
  for (const jo of data) {
    const { data: tracking } = await supabase
      .from('job_tracking')
      .select('latitude, longitude')
      .eq('job_order_id', jo.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log(`JO: ${jo.jo_number} | Status: ${jo.status} | Tracking:`, tracking?.[0] || 'NONE');
  }
}

checkActiveJOs();
