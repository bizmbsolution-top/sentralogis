import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSchema() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Columns:', Object.keys(data[0] || {}));
}

checkSchema();
