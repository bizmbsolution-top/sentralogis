import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const ids = ['f730cd13-b10a-40ee-a6c1-58952eebefd9'];
  const orQuery = `status.eq.available,id.in.(${ids.join(',')})`;
  console.log("Query:", orQuery);
  const { data, error } = await supabase.from('md_fleets').select('id').or(orQuery);
  console.log("Data:", data ? data.length : null);
  console.log("Error:", error);
}
run();
