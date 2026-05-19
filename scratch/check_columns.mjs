import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('job_routes')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching job_routes:', error);
  } else {
    console.log('Columns in job_routes:', Object.keys(data[0] || {}));
  }
}

checkColumns();
