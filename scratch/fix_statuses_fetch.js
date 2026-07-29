require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function fix() {
  console.log('Fixing orphaned JO statuses...');
  
  // 1: pending/assigned but accepted without started_at => ORDER DITERIMA
  const r1 = await fetch(`${supabaseUrl}/rest/v1/job_orders?status=in.(pending,assigned)&driver_response=eq.accepted&started_at=is.null`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ status: 'ORDER DITERIMA' })
  });
  const text1 = await r1.text();
  console.log('Fixed to ORDER DITERIMA:', text1);

  // 2: pending/assigned/ORDER DITERIMA but accepted with started_at => DALAM PERJALANAN
  const r2 = await fetch(`${supabaseUrl}/rest/v1/job_orders?status=in.(pending,assigned,ORDER%20DITERIMA)&driver_response=eq.accepted&started_at=not.is.null`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ status: 'DALAM PERJALANAN' })
  });
  const text2 = await r2.text();
  console.log('Fixed to DALAM PERJALANAN:', text2);
}

fix();
