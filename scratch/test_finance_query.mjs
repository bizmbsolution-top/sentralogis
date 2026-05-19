import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function testFinanceQuery() {
  console.log('Testing complex finance query...');
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
        *,
        wo_item:wo_items (
            *,
            wo:work_orders (
                *,
                customer:md_entities!customer_id(*)
            )
        )
    `)
    .limit(5);
  
  if (error) {
    console.error('QUERY FAILED:', error);
  } else {
    console.log('QUERY SUCCESS:', data.length, 'rows fetched');
  }
}

testFinanceQuery();
