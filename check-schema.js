require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function fetchOne(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log(table, await r.json());
}
async function run() {
  await fetchOne('wh_inbound_receipt_items');
  await fetchOne('wh_outbound_shipment_items');
  await fetchOne('wh_inbound_receipts');
  await fetchOne('wh_outbound_shipments');
}
run().catch(console.error);
