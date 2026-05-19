import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJOQuery() {
  const joId = '1c21dfeb-b9c3-42e0-be44-9056f24ff46a'; // JO-002
  console.log('Testing JO query for ID:', joId);
  
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      base_price,
      driver_phone,
      transporter:transporter_id(name),
      wo_item:wo_items!inner(
        id,
        item_data,
        wo:work_orders!inner(
          id,
          wo_number,
          customer:md_entities!customer_id(name, billing_method, phone)
        )
      )
    `)
    .in('id', [joId]);

  if (error) {
    console.error('JO Query Error:', error);
  } else {
    console.log('JO Query Success! Count:', data.length);
    if (data.length > 0) {
        console.log('JO Data:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No JO found with ID:', joId);
    }
  }
}

testJOQuery();
