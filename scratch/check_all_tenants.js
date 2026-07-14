const { createClient } = require('@supabase/supabase-js');
let ws;
try {
  ws = require('ws');
} catch (e) {}

const url = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(url, key, {
  auth: { persistSession: false },
  ...(ws ? { realtime: { transport: ws } } : {})
});

async function run() {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*');

  if (error) {
    console.error('Error fetching tenants:', error);
  } else {
    console.log('All tenants:', JSON.stringify(tenants, null, 2));
  }
}

run();
