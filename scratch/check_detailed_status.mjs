import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkDetailedStatus() {
  const joNumber = 'SL-TAM-0526-002/TR01/OWN-001'
  const { data: jo } = await supabase
    .from('job_orders')
    .select('id, status')
    .eq('jo_number', joNumber)
    .single()
    
  if (jo) {
    console.log('JO Status:', jo.status)
    const { data: routes } = await supabase
      .from('job_routes')
      .select('id, location_name, sequence, status, actual_arrival, actual_departure')
      .eq('job_order_id', jo.id)
      .order('sequence', { ascending: true })
      
    console.log('Routes Status:', routes)
    
    const { data: tracking } = await supabase
      .from('job_tracking')
      .select('*')
      .eq('job_order_id', jo.id)
      .order('created_at', { ascending: false })
      .limit(5)
      
    console.log('Latest Tracking:', tracking)
  }
}

checkDetailedStatus()
