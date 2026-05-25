
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) env[match[1].trim()] = match[2].trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkJo() {
  const { data, error } = await supabase
      .from('job_orders')
      .select('id')
      .eq('driver_id', '69eb4c45-a2e8-46aa-a221-5e5a6efd7a58');
      
  console.log('Query error:', error);
  console.log('Query result length:', data ? data.length : null);
}
checkJo();

