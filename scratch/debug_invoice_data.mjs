import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInvoiceData() {
  console.log('Checking Job Orders for Invoicing...');
  const { data: jos, error: joError } = await supabase
    .from('job_orders')
    .select(`
      id, jo_number, status, base_price,
      wo_item:wo_items(
        id, item_data,
        wo:work_orders(
          id, wo_number,
          customer:md_entities!customer_id(id, name)
        )
      )
    `)
    .in('status', ['ready_for_billing', 'invoiced', 'paid']);

  if (joError) {
    console.error('Fetch Error:', joError);
    return;
  }

  console.log('Count:', jos?.length || 0);
  if (jos && jos.length > 0) {
    jos.forEach(j => {
      console.log(`- JO: ${j.jo_number} | Status: ${j.status} | Customer: ${j.wo_item?.wo?.customer?.name}`);
    });
  } else {
    console.log('No Job Orders with status ready_for_billing, invoiced, or paid found.');
    
    // Check if there are ANY job orders and what their statuses are
    const { data: allJos, error: allError } = await supabase
        .from('job_orders')
        .select('status')
        .limit(10);
    
    if (allError) console.error('Error fetching all statuses:', allError);
    else {
        const statuses = allJos.map(j => j.status);
        console.log('Sample statuses in DB:', statuses);
    }
  }
}

checkInvoiceData();
