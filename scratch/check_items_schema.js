require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkItemsSchema() {
  const headers = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` };

  const inRes = await fetch(`${supabaseUrl}/rest/v1/wh_inbound_receipt_items?limit=1`, { headers });
  console.log('wh_inbound_receipt_items sample:', await inRes.json());

  const outRes = await fetch(`${supabaseUrl}/rest/v1/wh_outbound_shipment_items?limit=1`, { headers });
  console.log('wh_outbound_shipment_items sample:', await outRes.json());
}

checkItemsSchema().catch(console.error);
