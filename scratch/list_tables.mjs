const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function test() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_tables`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (res.ok) {
     console.log(await res.json());
  } else {
     // If RPC doesn't exist, try a simple query to a known table
     console.log('RPC failed, listing from select...');
     const res2 = await fetch(`${supabaseUrl}/rest/v1/job_orders?limit=1`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
     });
     console.log('job_orders status:', res2.status);
  }
}

test();
