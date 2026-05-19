import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkStatus() {
  const { data, error } = await supabase.from('job_orders').select('status, tracking_token').eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001').single();
  if (error) console.error(error);
  else console.log(data);
}

checkStatus();
