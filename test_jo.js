
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) env[match[1].trim()] = match[2].trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkJo() {
  const { data, error } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, driver_id')
      .eq('driver_id', '69eb4c45-a2e8-46aa-a221-5e5a6efd7a58')
      .order('created_at', { ascending: false })
      .limit(10);
      
  console.log('Jobs:', data);
}
checkJo();

