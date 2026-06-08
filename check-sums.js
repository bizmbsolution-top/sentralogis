require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function run() {
  const inRes = await fetch(`${url}/rest/v1/wh_inbound_receipt_items?select=product_sku_id,actual_good_qty,receipt_id,wh_inbound_receipts(id)`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  const inData = await inRes.json();
  const outRes = await fetch(`${url}/rest/v1/wh_outbound_shipment_items?select=product_sku_id,picked_qty,shipment_id,wh_outbound_shipments(id)`, { headers: { apikey: key, Authorization: `Bearer ${key}`} });
  const outData = await outRes.json();
  
  const grouped = {};
  for(const i of inData) {
     if(!grouped[i.product_sku_id]) grouped[i.product_sku_id] = { in: 0, out: 0, inOrphan: 0, outOrphan: 0 };
     if (i.wh_inbound_receipts) {
       grouped[i.product_sku_id].in += i.actual_good_qty || 0;
     } else {
       grouped[i.product_sku_id].inOrphan += i.actual_good_qty || 0;
     }
  }
  for(const o of outData) {
     if(!grouped[o.product_sku_id]) grouped[o.product_sku_id] = { in: 0, out: 0, inOrphan: 0, outOrphan: 0 };
     if (o.wh_outbound_shipments) {
       grouped[o.product_sku_id].out += o.picked_qty || 0;
     } else {
       grouped[o.product_sku_id].outOrphan += o.picked_qty || 0;
     }
  }
  for(const k in grouped) {
     const balance = grouped[k].in - grouped[k].out;
     const allBalance = (grouped[k].in + grouped[k].inOrphan) - (grouped[k].out + grouped[k].outOrphan);
     console.log('Product:', k);
     console.log('  Valid Balance:', balance, '(In:', grouped[k].in, 'Out:', grouped[k].out, ')');
     console.log('  All Balance:', allBalance, '(InOrphan:', grouped[k].inOrphan, 'OutOrphan:', grouped[k].outOrphan, ')');
  }
}
run().catch(console.error);
