import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function fixRoutes() {
  const joNumber = 'SL-TAM-0526-002/TR01/OWN-001'
  console.log(`Fixing routes for ${joNumber}...`)

  const { data: jo } = await supabase
    .from('job_orders')
    .select('id, wo_item_id')
    .eq('jo_number', joNumber)
    .single()
    
  if (!jo) return console.error('JO not found')

  const { data: item } = await supabase
    .from('wo_items')
    .select('item_data')
    .eq('id', jo.wo_item_id)
    .single()

  if (!item?.item_data?.stops) return console.error('No stops in item_data')

  const stops = item.item_data.stops
  const { data: routes } = await supabase
    .from('job_routes')
    .select('id, sequence')
    .eq('job_order_id', jo.id)

  if (!routes) return console.error('No job_routes found')

  for (const route of routes) {
      const stop = stops.find(s => s.sequence === route.sequence)
      if (stop && stop.latitude && stop.longitude) {
          console.log(`Updating route seq ${route.sequence} with coords ${stop.latitude}, ${stop.longitude}`)
          await supabase.from('job_routes').update({
              latitude: stop.latitude,
              longitude: stop.longitude
          }).eq('id', route.id)
      }
  }
  console.log('Fix complete')
}

fixRoutes()
