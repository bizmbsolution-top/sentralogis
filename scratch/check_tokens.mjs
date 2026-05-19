import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
  const { data, error } = await supabase.from('job_orders').select('tracking_token, driver_link_token, wa_token').limit(1);
  if (data && data.length > 0) {
    console.log('Sample Data:', data[0]);
  }
  // Better yet, use a query that fails or get column info if possible.
  // Actually, I can use a simple trick: try to insert a fake row and see the error (not recommended).
  // I'll try to find an existing tracking_token.
}

checkTypes();
