require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/job_tracking?select=id,job_order_id,status_update,created_at,latitude,longitude&order=created_at.desc&limit=10';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkPings() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });
  const data = await res.json();
  console.log('Recent 10 tracking logs:', data);
}

checkPings();
