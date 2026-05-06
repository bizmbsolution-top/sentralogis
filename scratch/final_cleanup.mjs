import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  const email = 'admin@binanusantara.com';
  console.log(`--- Cleaning up corrupted profile: ${email} ---`);
  
  // Ambil profil ID dulu
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
  
  if (profile) {
    // Hapus di tenants dulu
    await supabase.from('tenants').delete().eq('user_id', profile.id);
    // Hapus di profiles
    await supabase.from('profiles').delete().eq('id', profile.id);
    console.log('Cleanup Successful.');
  } else {
    console.log('No profile found to clean.');
  }
}

cleanup();
