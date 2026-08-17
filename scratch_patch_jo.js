const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function patchJO() {
  const jobId = '8cb020b3-5313-441a-b055-e4e60c4aff5b';
  
  const { data, error } = await supabase
    .from('job_orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', jobId)
    .select();
    
  if (error) {
    console.error("Error updating JO:", error);
  } else {
    console.log("Successfully updated JO to completed:", data[0]?.id, "Status:", data[0]?.status);
  }
}
patchJO();
