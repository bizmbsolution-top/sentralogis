require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function run() {
  const r1 = await fetch(`${url}/rest/v1/wh_inbound_receipt_items?select=id,wh_inbound_receipts(receipt_number,wo_items(job_orders(jo_number)))&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log('Inbound:', await r1.text());
  const r2 = await fetch(`${url}/rest/v1/wh_outbound_shipment_items?select=id,wh_outbound_shipments(shipment_number,wo_items(job_orders(jo_number)))&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log('Outbound:', await r2.text());
}
run().catch(console.error);
