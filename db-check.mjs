const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function check() {
  const driverId = '02966ca7-8fc4-4039-bf34-77e6e960e6e8';
  const joToken = 'f539f823-b458-421c-bcfd-1be0a5d75532';

  const driverRes = await fetch(`${supabaseUrl}/rest/v1/md_drivers?id=eq.${driverId}&select=has_native_app,last_app_open_at,device_fingerprint,last_device_login`, { headers });
  const driver = await driverRes.json();
  
  const joRes = await fetch(`${supabaseUrl}/rest/v1/job_orders?token=eq.${joToken}&select=status,driver_response,assigned_at,started_at`, { headers });
  const jo = await joRes.json();

  const trackingRes = await fetch(`${supabaseUrl}/rest/v1/job_tracking?jo_token=eq.${joToken}&select=recorded_at,latitude,longitude,accuracy&order=recorded_at.asc`, { headers });
  const tracking = await trackingRes.json();

  console.log("DRIVER:", JSON.stringify(driver[0], null, 2));
  console.log("JO:", JSON.stringify(jo[0], null, 2));
  
  if (tracking && tracking.length > 0) {
    console.log("TRACKING COUNT:", tracking.length);
    console.log("FIRST:", JSON.stringify(tracking[0], null, 2));
    console.log("LATEST:", JSON.stringify(tracking[tracking.length - 1], null, 2));
  } else {
    console.log("TRACKING COUNT:", 0);
  }
}

check().catch(console.error);
