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
  const fleetId = '0f2161b5-169f-4d98-9ce4-0ca87d24fc9f';
  console.log(`\nFetching fleet_gps_status for fleet ${fleetId}...`);
  const gpsStatus = await dbFetch('fleet_gps_status', `select=*&fleet_id=eq.${fleetId}`);
  console.log("Fleet GPS Status:", JSON.stringify(gpsStatus, null, 2));

  console.log(`\nFetching md_fleets for fleet ${fleetId}...`);
  const fleet = await dbFetch('md_fleets', `select=*&id=eq.${fleetId}`);
  console.log("Fleet Details:", JSON.stringify(fleet, null, 2));
}

main().catch(console.error);
