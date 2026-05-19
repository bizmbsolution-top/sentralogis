import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('=== Adding FK constraint: extra_costs.jo_id → job_orders.id ===');
  
  // 1. First check if any orphaned extra_costs exist (jo_id that doesn't exist in job_orders)
  const { data: allCosts } = await supabase.from('extra_costs').select('jo_id');
  const { data: allJos } = await supabase.from('job_orders').select('id');
  
  const joIdSet = new Set(allJos?.map(j => j.id));
  const orphans = allCosts?.filter(c => !joIdSet.has(c.jo_id));
  
  if (orphans?.length) {
    console.log(`WARNING: ${orphans.length} orphaned extra_costs found (jo_id not in job_orders):`);
    orphans.forEach(o => console.log(`  orphan jo_id: ${o.jo_id}`));
    console.log('These must be cleaned up before FK can be added.');
    
    // Delete orphans
    for (const o of orphans) {
      const { error } = await supabase.from('extra_costs').delete().eq('jo_id', o.jo_id);
      if (error) console.error(`  Failed to delete orphan ${o.jo_id}:`, error.message);
      else console.log(`  Deleted orphan jo_id: ${o.jo_id}`);
    }
  } else {
    console.log('No orphaned extra_costs found. Safe to add FK.');
  }

  // 2. Add FK constraint via RPC (raw SQL)
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_extra_costs_jo_id' 
          AND table_name = 'extra_costs'
        ) THEN
          ALTER TABLE public.extra_costs
            ADD CONSTRAINT fk_extra_costs_jo_id
            FOREIGN KEY (jo_id) REFERENCES public.job_orders(id)
            ON DELETE CASCADE;
          RAISE NOTICE 'FK constraint added successfully';
        ELSE
          RAISE NOTICE 'FK constraint already exists';
        END IF;
      END $$;
    `
  });

  if (error) {
    console.log('RPC exec_sql not available, trying direct approach...');
    console.log('Error:', error.message);
    console.log('\n>>> You need to run this SQL in Supabase Dashboard (SQL Editor):');
    console.log(`
-- 1. Add FK constraint
ALTER TABLE public.extra_costs
  ADD CONSTRAINT fk_extra_costs_jo_id
  FOREIGN KEY (jo_id) REFERENCES public.job_orders(id)
  ON DELETE CASCADE;

-- 2. Add performance index
CREATE INDEX IF NOT EXISTS idx_extra_costs_jo_status
  ON public.extra_costs(jo_id, status);

-- 3. Add index on jo_id alone for faster lookups
CREATE INDEX IF NOT EXISTS idx_extra_costs_jo_id
  ON public.extra_costs(jo_id);
    `);
  } else {
    console.log('FK constraint added via RPC!');
  }

  // 3. Verify FK by trying relational query again
  console.log('\n=== Verifying FK... ===');
  const { data: fkTest, error: fkError } = await supabase
    .from('extra_costs')
    .select('id, jo_id, job_orders(id, jo_number)')
    .limit(1);
  
  if (fkError) {
    console.log('FK still not available via PostgREST (may need cache refresh):', fkError.message);
  } else {
    console.log('FK works! Test result:', JSON.stringify(fkTest, null, 2));
  }
}

migrate();
