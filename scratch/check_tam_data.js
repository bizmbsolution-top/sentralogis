require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkTamData() {
  const custId = '476fc81c-aa68-414b-bcee-0bc169f1bbe7'; // TAM
  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  };

  const skusRes = await fetch(`${supabaseUrl}/rest/v1/md_product_skus?customer_id=eq.${custId}`, { headers });
  const skus = await skusRes.json();
  console.log('TAM md_product_skus:', skus.length, skus);

  const invRes = await fetch(`${supabaseUrl}/rest/v1/wh_inventory?customer_id=eq.${custId}`, { headers });
  const inv = await invRes.json();
  console.log('TAM wh_inventory:', inv.length, inv);

  // Check if there are products without customer_id or with different customer_id
  const allSkus = await fetch(`${supabaseUrl}/rest/v1/md_product_skus?select=id,sku_code,name,customer_id&limit=10`, { headers });
  console.log('Sample md_product_skus in DB:', await allSkus.json());
}

checkTamData().catch(console.error);
