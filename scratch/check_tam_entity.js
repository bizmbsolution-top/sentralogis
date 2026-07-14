require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkTam() {
  const res = await fetch(`${supabaseUrl}/rest/v1/md_entities?id=eq.476fc81c-aa68-414b-bcee-0bc169f1bbe7`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  const data = await res.json();
  console.log('TAM entity row:', data);

  const pRes = await fetch(`${supabaseUrl}/rest/v1/wh_products?customer_id=eq.476fc81c-aa68-414b-bcee-0bc169f1bbe7`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  const products = await pRes.json();
  console.log('TAM products count:', products.length);

  // Check how many products exist in total across wh_products
  const pAll = await fetch(`${supabaseUrl}/rest/v1/wh_products?select=id,name,sku,customer_id&limit=10`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  console.log('Sample wh_products in DB:', await pAll.json());
}

checkTam().catch(console.error);
