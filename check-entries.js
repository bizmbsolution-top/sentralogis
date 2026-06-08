require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function run() {
  const r1 = await fetch(`${url}/rest/v1/wh_inbound_receipt_items?select=putaway_entries,putaway_location_id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log('Inbound:', await r1.text());
  const r2 = await fetch(`${url}/rest/v1/wh_outbound_shipment_items?select=picking_entries&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  console.log('Outbound:', await r2.text());
}
run().catch(console.error);
