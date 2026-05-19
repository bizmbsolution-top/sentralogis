import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function checkTable() {
  const { data, error } = await supabase.from('app_notifications').select('*').limit(1);
  if (error) {
    const { data: data2, error: error2 } = await supabase.from('notifications').select('*').limit(1);
    if (error2) console.log('No notification table found');
    else console.log('Found table: notifications');
  } else {
    console.log('Found table: app_notifications');
  }
}

checkTable();
