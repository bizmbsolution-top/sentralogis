import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkJobRoutes() {
  const { data: jo } = await supabase
    .from('job_orders')
    .select('id')
    .eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001')
    .single()
    
  if (jo) {
    const { data: routes } = await supabase
      .from('job_routes')
      .select('*')
      .eq('job_order_id', jo.id)
      .order('sequence', { ascending: true })
      
    routes.forEach(r => {
      console.log(`Route ${r.sequence}: ${r.location_name} (${r.latitude}, ${r.longitude})`)
    })
  }
}

checkJobRoutes()
