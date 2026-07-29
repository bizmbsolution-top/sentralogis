const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const tenantId = 'd6f27bee-7ea7-4f99-88f7-bba8b19326c3';

async function q(path) {
  const res = await fetch(url + path, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
  return res.json();
}

function orQuery(field, ids) {
  return ids.map(id => field + '.eq.' + id).join(',');
}

async function main() {
  console.log('=== WORK ORDERS (last 5) ===');
  const wos = await q('/rest/v1/work_orders?tenant_id=eq.' + tenantId + '&order=created_at.desc&limit=5');
  console.log(JSON.stringify(wos, null, 2));
  
  if (wos.length === 0) { console.log('No WOs found'); return; }
  
  const woIds = wos.map(w => w.id);
  console.log('\n=== WO ITEMS ===');
  const items = await q('/rest/v1/wo_items?or=(' + orQuery('wo_id', woIds) + ')&limit=10');
  console.log(JSON.stringify(items, null, 2));
  
  if (items.length === 0) { console.log('No items found'); return; }
  
  const itemIds = items.map(i => i.id);
  console.log('\n=== JOB ORDERS ===');
  const jos = await q('/rest/v1/job_orders?or=(' + orQuery('wo_item_id', itemIds) + ')&limit=10');
  console.log(JSON.stringify(jos, null, 2));
  
  if (jos.length === 0) { console.log('No JOs found'); return; }
  
  const joIds = jos.map(j => j.id);
  console.log('\n=== JOB TRACKING (GPS pings) ===');
  const tracking = await q('/rest/v1/job_tracking?or=(' + orQuery('job_order_id', joIds) + ')&order=created_at.desc&limit=20');
  console.log(JSON.stringify(tracking, null, 2));
}

main().catch(console.error);
