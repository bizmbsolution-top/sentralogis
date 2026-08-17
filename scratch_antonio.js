const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkJO() {
  const jobId = 'cd7de854-5065-4f33-b64b-7fefb5987d2b';
  
  const { data: tracking, error: errTracking } = await supabase
    .from('job_tracking')
    .select('recorded_at, created_at, latitude, longitude, source')
    .eq('job_order_id', jobId)
    .order('recorded_at', { ascending: false })
    .limit(1);
    
  if (errTracking) {
    console.error(`Error fetching tracking for job ${jobId}:`, errTracking);
  } else if (tracking && tracking.length > 0) {
    console.log(`\nLatest GPS for JO ${jobId}:`);
    console.log("Recorded At (HP):", tracking[0].recorded_at);
    console.log("Created At (Server):", tracking[0].created_at);
    console.log("Lat/Lng:", tracking[0].latitude, tracking[0].longitude);
    console.log("Source:", tracking[0].source);
  } else {
    console.log(`\nNo GPS records for JO ${jobId}`);
  }
}
checkJO();
