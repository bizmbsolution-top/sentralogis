require('dotenv').config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/job_orders?select=id,updated_at&limit=1';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkDates() {
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });
  const data = await res.json();
  console.log('jo.updated_at sample:', data[0]?.updated_at);
}

checkDates();
