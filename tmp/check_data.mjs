import { readFileSync } from 'fs';

const envText = readFileSync('.env.local', 'utf8');
const vars = {};
envText.split('\n').filter(Boolean).forEach(l => {
  const idx = l.indexOf('=');
  if (idx > 0) vars[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
});

const base = vars.NEXT_PUBLIC_SUPABASE_URL;
const key = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hdrs = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };

async function q(url) {
  const r = await fetch(base + url, { headers: hdrs });
  if (!r.ok) { console.error('HTTP', r.status, await r.text()); return null; }
  return r.json();
}

async function main() {
  // List all receipts first
  const allRecs = await q("/rest/v1/wh_inbound_receipts?select=id,receipt_number,status,wo_item_id,warehouse_id&order=created_at.desc&limit=10");
  console.log('=== ALL RECEIPTS (last 10) ===');
  console.log(JSON.stringify(allRecs, null, 2));
  
  // Find by partial match
  const rec = allRecs ? allRecs.filter(r => r.receipt_number && r.receipt_number.includes('HALU-TAM')) : [];
  console.log('\n=== FILTERED (HALU-TAM) ===');
  console.log(JSON.stringify(rec, null, 2));
  
  if (rec && rec.length > 0) {
    const r = rec[0];
    
    // Find JO (wo_item_id references job_orders.id)
    const jo = await q('/rest/v1/job_orders?select=id,jo_number,status&id=eq.' + r.wo_item_id);
    console.log('\n=== JOB ORDER ===');
    console.log(JSON.stringify(jo, null, 2));
    
    // Check staff assignments
    const assigns = await q('/rest/v1/wh_jo_staff_assignments?select=id,staff_id,assigned_role,status&jo_id=eq.' + r.wo_item_id);
    console.log('\n=== STAFF ASSIGNMENTS ===');
    console.log(JSON.stringify(assigns, null, 2));
    
    // Check active staff in this warehouse
    const staff = await q('/rest/v1/md_warehouse_staff?select=id,name,role,is_active&warehouse_id=eq.' + r.warehouse_id);
    console.log('\n=== WAREHOUSE STAFF ===');
    console.log(JSON.stringify(staff, null, 2));
  }
}

main().catch(console.error);
