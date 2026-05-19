import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function fixPolicy() {
  const commands = [
    "DROP POLICY IF EXISTS driver_read_job_routes ON job_routes",
    "CREATE POLICY driver_read_job_routes ON job_routes FOR SELECT USING (EXISTS (SELECT 1 FROM job_orders jo WHERE jo.id = job_routes.job_order_id AND jo.driver_id IN (SELECT id FROM md_drivers WHERE entity_id IN (SELECT entity_id FROM tenant_users WHERE user_id = auth.uid()))))",
    "DROP POLICY IF EXISTS driver_update_job_routes ON job_routes",
    "CREATE POLICY driver_update_job_routes ON job_routes FOR UPDATE USING (EXISTS (SELECT 1 FROM job_orders jo WHERE jo.id = job_routes.job_order_id AND jo.driver_id IN (SELECT id FROM md_drivers WHERE entity_id IN (SELECT entity_id FROM tenant_users WHERE user_id = auth.uid()))))"
  ];

  for (const sql of commands) {
    const { error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
    if (error) {
       console.error(`Error executing: ${sql}`, error);
    } else {
       console.log(`Success: ${sql}`);
    }
  }
}

fixPolicy();
