const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ROLE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) {
    console.error('Error fetching tenants:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}
check();
