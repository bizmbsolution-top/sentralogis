import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function fixRoutes() {
  const joNumber = 'SL-TAM-0526-002/TR01/OWN-001'
  console.log(`Hard fixing routes for ${joNumber}...`)

  const { data: jo } = await supabase
    .from('job_orders')
    .select('id, wo_item_id')
    .eq('jo_number', joNumber)
    .single()
    
  if (!jo) return console.error('JO not found')

  // Gudang TAM 1 (Correct coords from WO metadata/address)
  await supabase.from('job_routes').update({
      latitude: -6.0794586,
      longitude: 106.6979258
  }).eq('job_order_id', jo.id).eq('sequence', 1)

  // NPCT1 Port (Correct coords)
  await supabase.from('job_routes').update({
      latitude: -6.0948999,
      longitude: 106.9230484
  }).eq('job_order_id', jo.id).eq('sequence', 2)

  console.log('Hard fix complete')
}

fixRoutes()
