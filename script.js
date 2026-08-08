import { config } from "dotenv";

config({ path: ".env.local" });

const tenantId = 'd6f27bee-7ea7-4f99-88f7-bba8b19326c3';
const joNumber = 'JALU-TMT-0826-001-01';
const token = 'f539f823-b458-421c-bcfd-1be0a5d75532';
const driverId = "02966ca7-8fc4-4039-bf34-77e6e960e6e8";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function api(table, query = '') {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  return res.json();
}

async function run() {
  console.log('--- 1. DRIVER ---');
  const drvList = await api('md_drivers', `tenant_id=eq.${tenantId}&id=eq.${driverId}`);
  console.log(JSON.stringify(drvList[0] || null, null, 2));

  console.log('\n--- 2. LATEST GPS FOR JO ---');
  const pings = await api('job_tracking', `job_order_id=eq.${token}&order=created_at.desc&limit=10`);
  console.log(JSON.stringify(pings, null, 2));

  console.log('\n--- 3. LATEST GPS GLOBALLY ---');
  const allPings = await api('job_tracking', `order=created_at.desc&limit=5`);
  console.log(JSON.stringify(allPings, null, 2));
}

run();
