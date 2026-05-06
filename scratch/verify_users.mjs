import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyUser(email) {
  console.log(`\n--- Verifying ${email} ---`);
  
  const { data: profile } = await supabase.from('profiles').select('*').eq('email', email).single();
  console.log('Profile Table Entry:', profile ? `YES (Role: ${profile.role}, ID: ${profile.id})` : 'NO');

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const authUser = users.find(u => u.email === email);
  console.log('Auth System Entry:', authUser ? `YES (ID: ${authUser.id})` : 'NO');
  
  if (profile && authUser && profile.id !== authUser.id) {
    console.log('⚠️ ALERT: ID Mismatch between Profile and Auth User!');
  }
}

async function main() {
  await verifyUser('admin1@sentralogis.com');
  await verifyUser('admin@halu.com');
}

main();
