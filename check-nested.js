require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function run() {
  const inRes = await fetch(`${url}/rest/v1/wh_inbound_receipt_items?select=actual_good_qty,product_sku_id,product_sku:product_sku_id(id,sku_code,name)`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log('Status:', inRes.status);
  const text = await inRes.text();
  console.log('Body:', text.substring(0, 200));
}
run().catch(console.error);
