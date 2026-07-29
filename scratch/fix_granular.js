require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function fix() {
  console.log('Recalculating granular status for "DALAM PERJALANAN" JOs...');
  
  // 1. Fetch JOs that are exactly "DALAM PERJALANAN"
  const res = await fetch(`${supabaseUrl}/rest/v1/job_orders?status=eq.DALAM%20PERJALANAN&select=id,jo_number`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const jos = await res.json();
  console.log(`Found ${jos.length} JOs to update.`);

  for (const jo of jos) {
    // 2. Fetch routes for this JO
    const routeRes = await fetch(`${supabaseUrl}/rest/v1/job_routes?job_order_id=eq.${jo.id}&order=sequence.asc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const routes = await routeRes.json();
    
    const activeStop = routes.find(r => r.status === 'arrived');
    const nextStop = routes.find(r => r.status === 'pending');
    
    let granularStatus = 'DALAM PERJALANAN';
    if (activeStop) {
      granularStatus = `TIBA DI ${activeStop.location_name.toUpperCase()}`.substring(0, 30);
    } else if (nextStop) {
      granularStatus = `MENUJU ${nextStop.location_name.toUpperCase()}`.substring(0, 30);
    } else {
      granularStatus = 'MENUNGGU SELESAI';
    }

    console.log(`Updating JO ${jo.jo_number} to ${granularStatus}`);

    await fetch(`${supabaseUrl}/rest/v1/job_orders?id=eq.${jo.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: granularStatus })
    });
  }
  console.log('Done recalculating statuses.');
}

fix();
