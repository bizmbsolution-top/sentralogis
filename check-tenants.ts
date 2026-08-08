import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function q(table: string, query = '') {
  const url = `${URL}/rest/v1/${table}?${query}`;
  const r = await fetch(url, { headers });
  if (!r.ok) { console.error(`ERROR:`, await r.text()); return []; }
  return r.json();
}

async function run() {
  const tenantB = 'c0611a0a-6210-4d6e-8206-504e6936adea';

  console.log('=== GPS STATUS SETELAH RE-SYNC ===');
  const gps = await q('fleet_gps_status', `select=fleet_id,latitude,longitude,speed,status_vehicle,engine_on,provider,gps_time&tenant_id=eq.${tenantB}&order=gps_time.desc`);
  console.log(`Total: ${gps.length}`);
  
  let driving = 0, idle = 0, parking = 0, engineOn = 0;
  gps.forEach((g: any) => {
    const status = g.status_vehicle === 2 ? 'DRIVING' : g.status_vehicle === 1 ? 'IDLE' : 'PARKING';
    if (g.status_vehicle === 2) driving++;
    else if (g.status_vehicle === 1) idle++;
    else parking++;
    if (g.engine_on) engineOn++;
    const ago = Math.round((Date.now() - new Date(g.gps_time).getTime()) / 60000);
    console.log(`  ${status.padEnd(8)} | spd: ${String(g.speed).padStart(3)} | engine: ${g.engine_on ? 'ON' : 'OFF'} | ${ago}m ago | ${g.latitude},${g.longitude}`);
  });

  console.log(`\n=== SUMMARY ===`);
  console.log(`DRIVING: ${driving}`);
  console.log(`IDLE: ${idle}`);
  console.log(`PARKING: ${parking}`);
  console.log(`ENGINE ON: ${engineOn}`);
}

run().catch(console.error);
