const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkJO() {
  const jobId = '8cb020b3-5313-441a-b055-e4e60c4aff5b';
  
  const { data: jo, error: errJo } = await supabase
    .from('job_orders')
    .select('*, driver:md_drivers!driver_id(*)')
    .eq('id', jobId)
    .single();
    
  if (errJo) console.error("Error fetching JO:", errJo);
  
  console.log("JO STATUS:", jo?.status);
  console.log("DRIVER RESPONSE:", jo?.driver_response);
  console.log("DRIVER NAME:", jo?.driver?.name);
  console.log("ROUTES/STOPS:");
  const routes = jo?.route_stops || [];
  routes.forEach(r => {
    console.log(`- Stop ${r.sequence}: ${r.stop_type} - ${r.location_name} (Completed: ${r.status}, Arrival: ${r.actual_arrival}, Departure: ${r.actual_departure})`);
  });

  const { count: trackingCount } = await supabase
    .from('job_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId);
    
  console.log("TOTAL GPS POINTS:", trackingCount);

}
checkJO();
