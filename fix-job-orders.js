require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  const res = await fetch(`${url}/rest/v1/wh_outbound_shipments?status=eq.COMPLETED&select=id,wo_item_id`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const shipments = await res.json();
  
  for (const s of shipments) {
    if (s.wo_item_id) {
       console.log('Fixing shipment', s.id, 'wo_item_id:', s.wo_item_id);
       
       await fetch(`${url}/rest/v1/wo_items?id=eq.${s.wo_item_id}`, {
         method: 'PATCH',
         headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: 'completed' })
       });
       
       await fetch(`${url}/rest/v1/job_orders?wo_item_id=eq.${s.wo_item_id}`, {
         method: 'PATCH',
         headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({ status: 'completed' })
       });
       
       const woRes = await fetch(`${url}/rest/v1/wo_items?id=eq.${s.wo_item_id}&select=wo_id`, {
         headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
       });
       const woItems = await woRes.json();
       if (woItems && woItems[0] && woItems[0].wo_id) {
           const woId = woItems[0].wo_id;
           
           const sibRes = await fetch(`${url}/rest/v1/wo_items?wo_id=eq.${woId}&select=status`, {
             headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
           });
           const siblings = await sibRes.json();
           
           const allDone = siblings.every(i => ['completed','done','selesai'].includes((i.status||'').toLowerCase()));
           
           await fetch(`${url}/rest/v1/work_orders?id=eq.${woId}`, {
             method: 'PATCH',
             headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ status: allDone ? 'done' : 'proses' })
           });
           console.log('Updated parent WO', woId, 'to', allDone ? 'done' : 'proses');
       }
    }
  }
}
run().catch(console.error);
