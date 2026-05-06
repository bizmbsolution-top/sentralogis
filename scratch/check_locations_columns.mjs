import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTable() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'md_locations' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: sample, error: selectError } = await supabase.from('md_locations').select('*').limit(1);
    if (selectError) {
      console.error('Error selecting from md_locations:', selectError);
    } else {
      console.log('Columns:', Object.keys(sample[0] || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkTable();
