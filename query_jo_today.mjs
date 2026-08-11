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
  const driverId1 = 'e0809ba5-e79a-4be7-91ae-1a07d7a85106';
  const driverId2 = '02966ca7-8fc4-4039-bf34-77e6e960e6e8';
  
  console.log("Fetching JOs for Antonio 1...");
  const jos1 = await dbFetch('job_orders', `select=id,jo_number,created_at&driver_id=eq.${driverId1}&order=created_at.desc&limit=1`);
  console.log("JOs 1:", jos1);

  console.log("\nFetching JOs for Antonio 2...");
  const jos2 = await dbFetch('job_orders', `select=id,jo_number,created_at&driver_id=eq.${driverId2}&order=created_at.desc&limit=1`);
  console.log("JOs 2:", jos2);
  
  // Let's also check if there is any JO created today for ANY driver
  const today = '2026-08-11T00:00:00';
  const recentJos = await dbFetch('job_orders', `select=id,jo_number,created_at,driver_id&created_at=gte.${today}&order=created_at.desc`);
  console.log("\nAll JOs created today:", recentJos);
}

main().catch(console.error);
