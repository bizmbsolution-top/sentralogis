import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 'undefined');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('--- Organizations Columns ---');
  const { data, error } = await supabase.from('organizations').select('*').limit(1);
  if (data && data[0]) {
    console.log(Object.keys(data[0]));
  }
  console.table(data);

  console.log('--- Profiles ---');
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*');
  if (profilesError) console.error(profilesError);
  else console.table(profiles);
}

checkData();
