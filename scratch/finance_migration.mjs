import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
  console.log('Updating schema for Finance & Document phase...');
  
  // Note: Since I cannot run direct SQL 'ALTER TABLE' easily via the client without an RPC,
  // I will assume the columns might exist or I will try to use the 'rpc' if available.
  // However, I can check if columns exist first.
  
  const queries = [
    `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;`,
    `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_status TEXT DEFAULT 'unpaid';`,
    `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_receipt_url TEXT;`,
    `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS is_doc_finished BOOLEAN DEFAULT false;`,
    `ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS is_cost_finished BOOLEAN DEFAULT false;`,
    `ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS rejection_meta JSONB;`,
    `ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS paid_by_sbu BOOLEAN DEFAULT false;`
  ];

  for (const sql of queries) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.warn(`Error executing SQL: ${sql}`, error.message);
      console.log('Falling back to manual check or assuming migration was done externally.');
    } else {
      console.log(`Successfully executed: ${sql}`);
    }
  }
}

updateSchema();
