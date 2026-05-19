import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkFleetIcon() {
  const { data: jo } = await supabase
    .from('job_orders')
    .select('fleet_id')
    .eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001')
    .single()
    
  if (jo) {
    const { data: fleet } = await supabase
      .from('md_fleets')
      .select('plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name, icon_url)')
      .eq('id', jo.fleet_id)
      .single()
      
    console.log('Fleet Info:', fleet)
  }
}

checkFleetIcon()
