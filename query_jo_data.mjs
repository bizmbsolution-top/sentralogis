const SUPABASE_URL = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

async function dbFetch(table, queryParams) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${queryParams}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch ${table}: ${res.status} ${res.statusText} - ${error}`);
  }
  return res.json();
}

async function main() {
  const driverId = 'e0809ba5-e79a-4be7-91ae-1a07d7a85106'; // Antonio from previous step
  console.log(`Fetching recent Job Orders for driver ${driverId}...`);
  const jos = await dbFetch('job_orders', `select=*&driver_id=eq.${driverId}&order=created_at.desc&limit=1`);
  
  if (!jos || jos.length === 0) return;
  const joId = jos[0].id;
  
  console.log(`\nFetching recent GPS tracking points for JO ${joId}...`);
  const gps = await dbFetch('job_tracking', `select=*&job_order_id=eq.${joId}&order=created_at.desc&limit=20`);
  console.log("Recent GPS tracking:", JSON.stringify(gps, null, 2));
}

main().catch(console.error);
