import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function listColumns() {
  const { data, error } = await supabase.from('tenant_users').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Columns in tenant_users:', Object.keys(data[0] || {}));

  const { data: orgData, error: orgError } = await supabase.from('organizations').select('*').limit(1);
  if (orgError) console.error(orgError);
  else console.log('Columns in organizations:', Object.keys(orgData[0] || {}));
}

listColumns();
