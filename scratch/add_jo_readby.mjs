import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function addCol() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: "ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS read_by uuid[] DEFAULT '{}';"
  });
  if (error) {
    console.error('Error adding column:', error);
  } else {
    console.log('Column read_by added or already exists');
  }
}

addCol();
