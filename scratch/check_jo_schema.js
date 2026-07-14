require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkJoSchema() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` };

  const res = await fetch(`${supabaseUrl}/rest/v1/job_orders?limit=1`, { headers });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    console.log('job_orders columns in database:', Object.keys(data[0]).sort());
    console.log('Sample row values for note/container related fields:', {
      notes: data[0].notes,
      container_number: data[0].container_number,
      seal_number: data[0].seal_number,
      special_instructions: data[0].special_instructions,
      description: data[0].description
    });
  } else {
    console.log('Response:', data);
  }
}

checkJoSchema().catch(console.error);
