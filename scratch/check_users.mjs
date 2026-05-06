import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

async function checkHaluUsers() {
  // 1. Find tenant HALU (in the tenants table)
  const { data: tenants, error: tError } = await s.from('tenants').select('id, name').ilike('name', '%HALU%');
  if (tError) { console.error('Tenant fetch error:', tError); return; }
  console.log('Tenants found:', tenants);

  if (tenants.length === 0) return;

  const haluId = tenants[0].id;

  // 2. Find profiles for this tenant (using company_id)
  const { data: profiles, error: pError } = await s.from('profiles').select('email, role, company_id').eq('company_id', haluId);
  if (pError) { console.error('Profiles fetch error:', pError); return; }
  console.log('Profiles for HALU:', profiles);

  // 3. Find HQ profiles (company_id is null or role starts with hq_ or is admin)
  const { data: hqProfiles, error: hqError } = await s.from('profiles').select('email, role, company_id').or('company_id.is.null,role.ilike.hq_%,role.eq.admin');
  if (hqError) { console.error('HQ Profiles fetch error:', hqError); return; }
  console.log('HQ/Admin Profiles:', hqProfiles);
}

checkHaluUsers();
