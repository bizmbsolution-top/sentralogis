const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

const SBU_SLA3_TARGETS = {
  TRUCKING: 2880,
  WAREHOUSE: 1440,
  CLEARANCE: 4320,
  FORWARDING: 7200
};

async function simulate() {
  const tenant_id = 'b0b30927-cff9-4ee9-a42d-f9cd935b25ff';
  
  const [{ data: wos }, { data: josSla }] = await Promise.all([
    supabase
      .from('work_orders')
      .select('id, wo_number, status, created_at, updated_at, target_date')
      .eq('tenant_id', tenant_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('job_orders')
      .select('id, status, sbu_type, created_at, updated_at')
      .eq('tenant_id', tenant_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  const workOrders = wos || [];
  const totalWO = workOrders.length;
  console.log("Total WOs:", totalWO);
  
  const localSlaData = [];
  
  if (totalWO === 0) {
    console.log("0 WOs");
  } else {
    // SLA 1
    const passSla1 = workOrders.filter(wo => wo.status !== 'DRAFT').length;
    localSlaData.push({ sla_stage: 'SLA 1', pct: Math.round((passSla1 / totalWO) * 100) });
    
    // SLA 4
    const passSla4 = workOrders.filter(wo => ['COMPLETED','PAID'].includes(wo.status)).length;
    localSlaData.push({ sla_stage: 'SLA 4', pct: Math.round((passSla4 / totalWO) * 100) || 0 });

    // SLA 5
    const passSla5 = workOrders.filter(wo => wo.status === 'PAID').length;
    localSlaData.push({ sla_stage: 'SLA 5', pct: Math.round((passSla5 / totalWO) * 100) || 0 });
  }
  
  console.log("SLA Data:", localSlaData);
  
  // Job orders SLA 3
  const sbuList = ['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'];
  let totalSla3 = 0, passSla3 = 0;
  for (const sbu of sbuList) {
    const sbuJos = (josSla || []).filter(j => (j.sbu_type || 'TRUCKING').toUpperCase() === sbu);
    const total = sbuJos.length;
    const targetMin = SBU_SLA3_TARGETS[sbu] || 2880;
    let pass = 0;
    for (const j of sbuJos) {
      const created = new Date(j.created_at || Date.now()).getTime();
      const updated = new Date(j.updated_at || Date.now()).getTime();
      const diffMin = (updated - created) / (1000 * 60);
      if (['COMPLETED', 'PAID', 'DONE', 'SELESAI', 'PEKERJAAN SELESAI', 'RECEIVED'].includes((j.status || '').toUpperCase()) && diffMin <= targetMin) {
        pass++;
      }
    }
    totalSla3 += total;
    passSla3 += pass;
  }
  console.log(`SLA 3: pass ${passSla3}, total ${totalSla3}, pct ${totalSla3 > 0 ? Math.round((passSla3/totalSla3)*100) : 0}`);
}
simulate();
