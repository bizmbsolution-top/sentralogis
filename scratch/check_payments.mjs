import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkPaymentFields() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('jo_number, advance_amount, driver_payment_amount, driver_payment_status')
    .eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001')
    .single()
  
  console.log('Payment Data:', data || error)
}

checkPaymentFields()
