const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkWOs() {
  const tenantId = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff';
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo);
    
  console.log("Error:", error);
  console.log("WOs found:", data?.length);
  if (data?.length > 0) {
    console.log("First few WOs:", data.slice(0, 3));
  }
}
checkWOs();
