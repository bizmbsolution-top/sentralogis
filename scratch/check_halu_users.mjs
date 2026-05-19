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

async function checkHaluTenantUsersFinal() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .like('email', '%@halu.com');

  const userIds = profiles.map(u => u.id);
  const { data: tenantUsers } = await supabase
    .from('tenant_users')
    .select('user_id, role_code, full_name, sbu_id')
    .in('user_id', userIds);

  console.table(tenantUsers.map(tu => ({
    Email: profiles.find(u => u.id === tu.user_id)?.email,
    Role: tu.role_code,
    SBU_ID: tu.sbu_id
  })));
}

checkHaluTenantUsersFinal();
