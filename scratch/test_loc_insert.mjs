import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});
async function run() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Login to get session (since RLS is enabled)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com', // Need a valid user, or we can use service role key
    password: 'password123'
  });
  console.log('Auth:', authError ? authError.message : 'Success');

  // Let's just fetch without auth to see if it fails due to RLS
  const { data, error } = await supabase.from('md_warehouse_locations').select('*').limit(1);
  console.log('Select Error:', error);
  console.log('Select Data:', data);
}
run();
