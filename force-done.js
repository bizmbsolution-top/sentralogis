require('dotenv').config({path: '.env.local'});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const woId = 'fc62073d-c7a6-49f6-b9bf-d0dfb9b7ec9a';
  console.log("Using Service Role Key to bypass RLS...");
  
  // 1. Get wo_items for this WO
  const res = await fetch(`${url}/rest/v1/wo_items?wo_id=eq.${woId}&select=id,status`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log('wo_items before:', data);
  
  // 2. Update each wo_item and their job_orders to completed
  for (const item of data) {
    const p1 = await fetch(`${url}/rest/v1/wo_items?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    console.log('Patch wo_item', item.id, p1.status, await p1.text());
    
    const p2 = await fetch(`${url}/rest/v1/job_orders?wo_item_id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    console.log('Patch job_orders for wo_item', item.id, p2.status, await p2.text());
  }
  
  // 3. Update the parent work_order to done
  const p3 = await fetch(`${url}/rest/v1/work_orders?id=eq.${woId}`, {
     method: 'PATCH',
     headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
     body: JSON.stringify({ status: 'done' })
  });
  console.log('Patch work_order', woId, p3.status, await p3.text());
  
  console.log("Forced WO to done!");
}
run().catch(console.error);
