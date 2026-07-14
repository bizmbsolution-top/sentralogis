require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function test() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  };

  try {
    const inbUrl = `${SUPABASE_URL}/rest/v1/wh_inbound_receipts?select=id,receipt_number,status,wo_item_id`;
    const inbRes = await fetch(inbUrl, { headers });
    const inbounds = await inbRes.json();
    console.log('Inbound Receipts:', JSON.stringify(inbounds, null, 2));

    const outUrl = `${SUPABASE_URL}/rest/v1/wh_outbound_shipments?select=id,shipment_number,status,wo_item_id`;
    const outRes = await fetch(outUrl, { headers });
    const outbounds = await outRes.json();
    console.log('Outbound Shipments:', JSON.stringify(outbounds, null, 2));

  } catch(e) {
    console.error(e);
  }
}

test();
